-- Support tickets: users open them (optionally on behalf of an organization they belong to),
-- read their own, and platform admins work the queue and record a resolution.
alter table public.support_tickets
  add column updated_at timestamptz not null default now(),
  add column resolution_note text,
  add constraint support_tickets_subject_length check (char_length(subject) between 3 and 160),
  add constraint support_tickets_body_length check (char_length(body) between 10 and 5000),
  add constraint support_tickets_status_values check (status in ('open', 'in_progress', 'resolved', 'closed'));

grant select on public.support_tickets to benefitly_app;

create function public.create_support_ticket(ticket_subject text, ticket_body text, target_org uuid)
returns public.support_tickets language plpgsql security definer set search_path = public as $$
declare created public.support_tickets;
begin
  if public.current_user_id() is null then raise exception 'sign in required'; end if;
  if target_org is not null and not public.is_org_member(target_org) then
    raise exception 'not a member of this organization';
  end if;
  insert into public.support_tickets (profile_id, organization_id, subject, body)
  values (public.current_user_id(), target_org, ticket_subject, ticket_body)
  returning * into created;
  return created;
end;
$$;
revoke all on function public.create_support_ticket(text, text, uuid) from public;
grant execute on function public.create_support_ticket(text, text, uuid) to public;

create function public.admin_list_support_tickets(row_limit integer default 100)
returns setof public.support_tickets language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'not authorized to view the support queue'; end if;
  return query select * from public.support_tickets order by created_at desc limit row_limit;
end;
$$;
revoke all on function public.admin_list_support_tickets(integer) from public;
grant execute on function public.admin_list_support_tickets(integer) to public;

create function public.admin_update_support_ticket(target_ticket uuid, new_status text, note text)
returns public.support_tickets language plpgsql security definer set search_path = public as $$
declare updated public.support_tickets;
begin
  if not public.is_platform_admin() then raise exception 'not authorized to manage support tickets'; end if;
  update public.support_tickets
  set status = new_status, resolution_note = coalesce(note, resolution_note), updated_at = now()
  where id = target_ticket
  returning * into updated;
  if updated.id is null then raise exception 'ticket not found'; end if;
  return updated;
end;
$$;
revoke all on function public.admin_update_support_ticket(uuid, text, text) from public;
grant execute on function public.admin_update_support_ticket(uuid, text, text) to public;
