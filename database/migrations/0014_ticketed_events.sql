-- Ticketed fundraising events (banquets, dinners, luncheons, etc.) for any campaign -- individual
-- or organization-owned, since campaigns already support both (0001's owner_id/organization_id).
-- A ticket purchase is a donation (same create_pending_donation/settle_donation pipeline already
-- used for regular giving, same Stripe PaymentIntent, same campaign raised_amount accounting) with
-- one or more generated ticket rows attached once the donation settles.

create type public.ticket_status as enum ('valid', 'checked_in', 'refunded', 'cancelled');

create table public.campaign_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id),
  title text not null check (char_length(title) between 2 and 160),
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index campaign_events_campaign_idx on public.campaign_events (campaign_id, starts_at);

create table public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  campaign_event_id uuid not null references public.campaign_events(id),
  name text not null check (char_length(name) between 1 and 120),
  price_cents integer not null check (price_cents >= 0),
  currency char(3) not null default 'USD',
  quantity_available integer check (quantity_available is null or quantity_available > 0),
  quantity_sold integer not null default 0 check (quantity_sold >= 0),
  sort_order integer not null default 0
);
create index ticket_types_event_idx on public.ticket_types (campaign_event_id, sort_order);

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_type_id uuid not null references public.ticket_types(id),
  campaign_event_id uuid not null references public.campaign_events(id),
  donation_id uuid not null references public.donations(id),
  code text not null unique,
  purchaser_id uuid references public.profiles(id),
  attendee_name text not null,
  attendee_email text not null,
  attendee_phone text,
  status public.ticket_status not null default 'valid',
  checked_in_at timestamptz,
  checked_in_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index tickets_event_idx on public.tickets (campaign_event_id, status);
create index tickets_donation_idx on public.tickets (donation_id);

alter table public.campaign_events enable row level security;
alter table public.ticket_types enable row level security;
alter table public.tickets enable row level security;

-- Events and ticket types for a published campaign are public (anyone must be able to see what's
-- for sale before buying); an organizer also sees their own campaign's events/types regardless of
-- the campaign's own publish state, same shape as campaigns_public_read (0001).
create policy campaign_events_read on public.campaign_events for select using (
  exists (select 1 from public.campaigns c where c.id = campaign_id and (c.status = 'published' or c.owner_id = public.current_user_id() or (c.organization_id is not null and public.is_org_member(c.organization_id))))
);
create policy ticket_types_read on public.ticket_types for select using (
  exists (select 1 from public.campaign_events e join public.campaigns c on c.id = e.campaign_id where e.id = campaign_event_id and (c.status = 'published' or c.owner_id = public.current_user_id() or (c.organization_id is not null and public.is_org_member(c.organization_id))))
);
-- Tickets carry attendee PII (name/email/phone) -- never publicly readable. Only the campaign
-- owner/org (for the check-in roster) and the ticket's own purchaser may see a row.
create policy tickets_owner_read on public.tickets for select using (
  purchaser_id = public.current_user_id()
  or exists (select 1 from public.campaign_events e join public.campaigns c on c.id = e.campaign_id where e.id = campaign_event_id and (c.owner_id = public.current_user_id() or (c.organization_id is not null and public.is_org_member(c.organization_id))))
);

grant select on public.campaign_events, public.ticket_types, public.tickets to benefitly_app;
revoke insert, update, delete on public.campaign_events, public.ticket_types, public.tickets from public;

create function public.create_campaign_event(target_campaign uuid, event_title text, event_description text, event_starts_at timestamptz, event_ends_at timestamptz, event_location text)
returns public.campaign_events language plpgsql security definer set search_path = public as $$
declare created public.campaign_events; campaign_owner uuid; campaign_org uuid;
begin
  select owner_id, organization_id into campaign_owner, campaign_org from public.campaigns where id = target_campaign;
  if campaign_owner is distinct from public.current_user_id() and not (campaign_org is not null and public.is_org_member(campaign_org)) then
    raise exception 'not authorized to add an event to this campaign';
  end if;
  insert into public.campaign_events (campaign_id, title, description, starts_at, ends_at, location, created_by)
  values (target_campaign, event_title, event_description, event_starts_at, event_ends_at, event_location, public.current_user_id())
  returning * into created;
  return created;
end;
$$;
revoke all on function public.create_campaign_event(uuid, text, text, timestamptz, timestamptz, text) from public;
grant execute on function public.create_campaign_event(uuid, text, text, timestamptz, timestamptz, text) to public;

create function public.create_ticket_type(target_event uuid, type_name text, type_price_cents integer, type_currency char(3), type_quantity_available integer)
returns public.ticket_types language plpgsql security definer set search_path = public as $$
declare created public.ticket_types; target_campaign uuid; campaign_owner uuid; campaign_org uuid;
begin
  select campaign_id into target_campaign from public.campaign_events where id = target_event;
  select owner_id, organization_id into campaign_owner, campaign_org from public.campaigns where id = target_campaign;
  if campaign_owner is distinct from public.current_user_id() and not (campaign_org is not null and public.is_org_member(campaign_org)) then
    raise exception 'not authorized to add a ticket type to this event';
  end if;
  insert into public.ticket_types (campaign_event_id, name, price_cents, currency, quantity_available)
  values (target_event, type_name, type_price_cents, type_currency, type_quantity_available)
  returning * into created;
  return created;
end;
$$;
revoke all on function public.create_ticket_type(uuid, text, integer, char(3), integer) from public;
grant execute on function public.create_ticket_type(uuid, text, integer, char(3), integer) to public;

-- Called right after create_pending_donation for a ticket order: atomically checks remaining
-- capacity, bumps quantity_sold, and mints `quantity` ticket rows with unique codes. Tickets exist
-- from the moment of purchase attempt (status 'valid') exactly like the donation itself starts
-- 'pending' before settlement -- settle_donation/fail_donation (0003) already govern whether the
-- underlying charge succeeded; a ticket whose donation never settles is simply never emailed/
-- checked in, the same way a pending donation never raises raised_amount until settled.
create function public.reserve_tickets(target_donation uuid, target_ticket_type uuid, quantity integer, name_on_order text, email_on_order text, phone_on_order text)
returns setof public.tickets language plpgsql security definer set search_path = public as $$
declare remaining integer; i integer; new_code text; inserted public.tickets; target_event uuid;
begin
  if quantity < 1 or quantity > 20 then raise exception 'ticket quantity must be between 1 and 20'; end if;
  select quantity_available - quantity_sold, campaign_event_id into remaining, target_event from public.ticket_types where id = target_ticket_type for update;
  if target_event is null then raise exception 'ticket type not found'; end if;
  if remaining is not null and remaining < quantity then raise exception 'only % tickets remain for this type', remaining; end if;

  update public.ticket_types set quantity_sold = quantity_sold + quantity where id = target_ticket_type;

  for i in 1..quantity loop
    new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    insert into public.tickets (ticket_type_id, campaign_event_id, donation_id, code, purchaser_id, attendee_name, attendee_email, attendee_phone)
    values (target_ticket_type, target_event, target_donation, new_code, public.current_user_id(), name_on_order, email_on_order, phone_on_order)
    returning * into inserted;
    return next inserted;
  end loop;
  return;
end;
$$;
revoke all on function public.reserve_tickets(uuid, uuid, integer, text, text, text) from public;
grant execute on function public.reserve_tickets(uuid, uuid, integer, text, text, text) to public;

-- Fetches the tickets for a just-settled donation, with enough event context to compose a
-- confirmation message, so the webhook handler can email/text them -- runs with no caller
-- identity (invoked from the signature-verified webhook, like update_payment_account_status in
-- 0009), so it is intentionally not scoped by current_user_id().
create function public.tickets_for_donation(target_donation uuid) returns table (
  id uuid, code text, attendee_name text, attendee_email text, attendee_phone text,
  event_title text, event_starts_at timestamptz, event_location text
) language sql stable security definer set search_path = public as $$
  select t.id, t.code, t.attendee_name, t.attendee_email, t.attendee_phone, e.title, e.starts_at, e.location
  from public.tickets t join public.campaign_events e on e.id = t.campaign_event_id
  where t.donation_id = target_donation order by t.created_at asc
$$;
revoke all on function public.tickets_for_donation(uuid) from public;
grant execute on function public.tickets_for_donation(uuid) to public;

-- Self-service check-in: knowing a ticket's own code is the authorization, the same trust model
-- as a boarding-pass barcode or a password-reset link -- no session required, so this also works
-- for a guest who purchased without an account. Returns only that one ticket's own public-safe
-- fields, never the full roster.
create function public.self_check_in_ticket(ticket_code text)
returns table (attendee_name text, event_title text, already_checked_in boolean, checked_in_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare found_ticket public.tickets; found_event public.campaign_events;
begin
  select * into found_ticket from public.tickets where code = upper(trim(ticket_code));
  if found_ticket.id is null then raise exception 'ticket code not found'; end if;
  if found_ticket.status = 'refunded' or found_ticket.status = 'cancelled' then raise exception 'this ticket is no longer valid'; end if;

  select * into found_event from public.campaign_events where id = found_ticket.campaign_event_id;

  if found_ticket.status = 'checked_in' then
    return query select found_ticket.attendee_name, found_event.title, true, found_ticket.checked_in_at;
    return;
  end if;

  update public.tickets set status = 'checked_in', checked_in_at = now() where id = found_ticket.id;
  return query select found_ticket.attendee_name, found_event.title, false, now();
end;
$$;
revoke all on function public.self_check_in_ticket(text) from public;
grant execute on function public.self_check_in_ticket(text) to public;

-- Organizer roster + staff-assisted check-in for a specific event, gated the same way
-- list_campaign_donors (0013) is: WHERE-clause guard, empty/not-found rather than an error, for
-- a caller who isn't the campaign owner/org.
create function public.organizer_list_event_tickets(target_event uuid) returns setof public.tickets
language sql stable security definer set search_path = public as $$
  select t.* from public.tickets t
  join public.campaign_events e on e.id = t.campaign_event_id
  join public.campaigns c on c.id = e.campaign_id
  where t.campaign_event_id = target_event
    and (c.owner_id = public.current_user_id() or (c.organization_id is not null and public.is_org_member(c.organization_id)))
  order by t.attendee_name asc
$$;
revoke all on function public.organizer_list_event_tickets(uuid) from public;
grant execute on function public.organizer_list_event_tickets(uuid) to public;

create function public.organizer_check_in_ticket(target_event uuid, ticket_code text)
returns public.tickets language plpgsql security definer set search_path = public as $$
declare updated public.tickets; campaign_owner uuid; campaign_org uuid; target_campaign uuid;
begin
  select campaign_id into target_campaign from public.campaign_events where id = target_event;
  select owner_id, organization_id into campaign_owner, campaign_org from public.campaigns where id = target_campaign;
  if campaign_owner is distinct from public.current_user_id() and not (campaign_org is not null and public.is_org_member(campaign_org)) then
    raise exception 'not authorized to check in tickets for this event';
  end if;
  update public.tickets set status = 'checked_in', checked_in_at = now(), checked_in_by = public.current_user_id()
  where campaign_event_id = target_event and code = upper(trim(ticket_code)) and status = 'valid'
  returning * into updated;
  if updated.id is null then raise exception 'ticket not found, already checked in, or no longer valid'; end if;
  return updated;
end;
$$;
revoke all on function public.organizer_check_in_ticket(uuid, text) from public;
grant execute on function public.organizer_check_in_ticket(uuid, text) to public;

-- Every event a published (or own) campaign has, with a sold/available count for display.
create function public.list_campaign_events(target_campaign uuid) returns table (
  id uuid, title text, description text, starts_at timestamptz, ends_at timestamptz, location text
) language sql stable security definer set search_path = public as $$
  select e.id, e.title, e.description, e.starts_at, e.ends_at, e.location
  from public.campaign_events e
  join public.campaigns c on c.id = e.campaign_id
  where e.campaign_id = target_campaign
    and (c.status = 'published' or c.owner_id = public.current_user_id() or (c.organization_id is not null and public.is_org_member(c.organization_id)))
  order by e.starts_at asc
$$;
revoke all on function public.list_campaign_events(uuid) from public;
grant execute on function public.list_campaign_events(uuid) to public;

create function public.list_event_ticket_types(target_event uuid) returns table (
  id uuid, name text, price_cents integer, currency char(3), quantity_available integer, quantity_sold integer
) language sql stable security definer set search_path = public as $$
  select tt.id, tt.name, tt.price_cents, tt.currency, tt.quantity_available, tt.quantity_sold
  from public.ticket_types tt
  join public.campaign_events e on e.id = tt.campaign_event_id
  join public.campaigns c on c.id = e.campaign_id
  where tt.campaign_event_id = target_event
    and (c.status = 'published' or c.owner_id = public.current_user_id() or (c.organization_id is not null and public.is_org_member(c.organization_id)))
  order by tt.sort_order asc
$$;
revoke all on function public.list_event_ticket_types(uuid) from public;
grant execute on function public.list_event_ticket_types(uuid) to public;
