-- Association-management write path: organization creation, members, dues, benefit programs and
-- claims, events and registration, and announcements. Every table this touches (members,
-- member_contributions, benefit_programs, benefit_claims, claim_approvals, events,
-- event_registrations, announcements) had row level security enabled in 0002 with only a
-- read policy -- no insert policy exists anywhere, so every write here goes through a
-- security-definer function that checks the caller's permission first.

-- security definer: same reasoning as is_org_member/is_platform_admin -- called from RLS
-- policies and from other security-definer functions, must not depend on the calling role's
-- own grants on organization_members.
create function public.has_permission(target_org uuid, perm text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = target_org and user_id = public.current_user_id() and status = 'active' and perm = any(permissions)
  )
$$;

create function public.create_organization(org_name text, org_slug text) returns public.organizations language plpgsql security definer set search_path = public as $$
declare created public.organizations;
begin
  insert into public.organizations (slug, name, created_by) values (org_slug, org_name, public.current_user_id()) returning * into created;
  insert into public.organization_members (organization_id, user_id, status, permissions, joined_at)
  values (created.id, public.current_user_id(), 'active',
    array['organization.manage','members.manage','finance.manage','benefits.manage','events.manage','communications.manage','payouts.approve'], now());
  return created;
end;
$$;
revoke all on function public.create_organization(text, text) from public;
grant execute on function public.create_organization(text, text) to public;

create function public.add_member(target_org uuid, member_user_id uuid, number text, level text, contact_info jsonb)
returns public.members language plpgsql security definer set search_path = public as $$
declare inserted public.members;
begin
  if not public.has_permission(target_org, 'members.manage') then raise exception 'not authorized to manage members'; end if;
  insert into public.members (organization_id, user_id, member_number, membership_level, contact, status, joined_at)
  values (target_org, member_user_id, number, level, coalesce(contact_info, '{}'::jsonb), 'active', now())
  returning * into inserted;
  return inserted;
end;
$$;
revoke all on function public.add_member(uuid, uuid, text, text, jsonb) from public;
grant execute on function public.add_member(uuid, uuid, text, text, jsonb) to public;

create function public.record_member_contribution(target_org uuid, target_member uuid, kind_name text, amount_value integer, currency_code char(3))
returns public.member_contributions language plpgsql security definer set search_path = public as $$
declare inserted public.member_contributions; kind_id uuid;
begin
  if not public.has_permission(target_org, 'finance.manage') then raise exception 'not authorized to record contributions'; end if;
  select id into kind_id from public.contribution_types where organization_id = target_org and name = kind_name;
  if kind_id is null then
    insert into public.contribution_types (organization_id, name, kind) values (target_org, kind_name, 'dues') returning id into kind_id;
  end if;
  insert into public.member_contributions (organization_id, member_id, contribution_type_id, amount, currency, status, paid_at)
  values (target_org, target_member, kind_id, amount_value, currency_code, 'paid', now())
  returning * into inserted;
  return inserted;
end;
$$;
revoke all on function public.record_member_contribution(uuid, uuid, text, integer, char(3)) from public;
grant execute on function public.record_member_contribution(uuid, uuid, text, integer, char(3)) to public;

create function public.create_benefit_program(target_org uuid, program_name text, program_description text, eligibility_text text, max_amount integer, waiting_days integer)
returns public.benefit_programs language plpgsql security definer set search_path = public as $$
declare inserted public.benefit_programs;
begin
  if not public.has_permission(target_org, 'benefits.manage') then raise exception 'not authorized to manage benefit programs'; end if;
  insert into public.benefit_programs (organization_id, name, description, eligibility, maximum_amount, waiting_period_days)
  values (target_org, program_name, program_description, eligibility_text, max_amount, coalesce(waiting_days, 0))
  returning * into inserted;
  return inserted;
end;
$$;
revoke all on function public.create_benefit_program(uuid, text, text, text, integer, integer) from public;
grant execute on function public.create_benefit_program(uuid, text, text, text, integer, integer) to public;

create function public.submit_benefit_claim(target_org uuid, target_program uuid, target_member uuid, amount_requested integer, claim_reason text)
returns public.benefit_claims language plpgsql security definer set search_path = public as $$
declare inserted public.benefit_claims; member_user uuid;
begin
  select user_id into member_user from public.members where id = target_member and organization_id = target_org;
  if member_user is distinct from public.current_user_id() and not public.has_permission(target_org, 'benefits.manage') then
    raise exception 'not authorized to submit a claim for this member';
  end if;
  insert into public.benefit_claims (organization_id, program_id, member_id, requested_amount, reason)
  values (target_org, target_program, target_member, amount_requested, claim_reason)
  returning * into inserted;
  return inserted;
end;
$$;
revoke all on function public.submit_benefit_claim(uuid, uuid, uuid, integer, text) from public;
grant execute on function public.submit_benefit_claim(uuid, uuid, uuid, integer, text) to public;

create function public.decide_benefit_claim(target_org uuid, target_claim uuid, decision text, note text)
returns public.benefit_claims language plpgsql security definer set search_path = public as $$
declare updated public.benefit_claims;
begin
  if not public.has_permission(target_org, 'benefits.manage') then raise exception 'not authorized to decide claims'; end if;
  if decision not in ('approved', 'denied') then raise exception 'decision must be approved or denied'; end if;
  insert into public.claim_approvals (claim_id, reviewer_id, decision, note) values (target_claim, public.current_user_id(), decision, note);
  update public.benefit_claims set status = decision::public.claim_status, reviewed_at = now() where id = target_claim and organization_id = target_org returning * into updated;
  return updated;
end;
$$;
revoke all on function public.decide_benefit_claim(uuid, uuid, text, text) from public;
grant execute on function public.decide_benefit_claim(uuid, uuid, text, text) to public;

create function public.create_event(target_org uuid, event_title text, event_description text, starts timestamptz, ends timestamptz, event_location text, event_capacity integer, event_visibility text)
returns public.events language plpgsql security definer set search_path = public as $$
declare inserted public.events;
begin
  if not public.has_permission(target_org, 'events.manage') then raise exception 'not authorized to manage events'; end if;
  insert into public.events (organization_id, title, description, starts_at, ends_at, location, capacity, visibility)
  values (target_org, event_title, event_description, starts, ends, event_location, event_capacity, coalesce(event_visibility, 'members'))
  returning * into inserted;
  return inserted;
end;
$$;
revoke all on function public.create_event(uuid, text, text, timestamptz, timestamptz, text, integer, text) from public;
grant execute on function public.create_event(uuid, text, text, timestamptz, timestamptz, text, integer, text) to public;

create function public.register_for_event(target_event uuid, target_member uuid)
returns public.event_registrations language plpgsql security definer set search_path = public as $$
declare inserted public.event_registrations; target_org uuid; member_user uuid;
begin
  select organization_id into target_org from public.events where id = target_event;
  select user_id into member_user from public.members where id = target_member and organization_id = target_org;
  if member_user is distinct from public.current_user_id() and not public.has_permission(target_org, 'events.manage') then
    raise exception 'not authorized to register this member';
  end if;
  insert into public.event_registrations (organization_id, event_id, member_id, status)
  values (target_org, target_event, target_member, 'registered')
  on conflict (event_id, member_id) do update set status = 'registered'
  returning * into inserted;
  return inserted;
end;
$$;
revoke all on function public.register_for_event(uuid, uuid) from public;
grant execute on function public.register_for_event(uuid, uuid) to public;

create function public.post_announcement(target_org uuid, announcement_title text, announcement_body text)
returns public.announcements language plpgsql security definer set search_path = public as $$
declare inserted public.announcements;
begin
  if not public.has_permission(target_org, 'communications.manage') then raise exception 'not authorized to post announcements'; end if;
  insert into public.announcements (organization_id, author_id, title, body, published_at) values (target_org, public.current_user_id(), announcement_title, announcement_body, now()) returning * into inserted;
  return inserted;
end;
$$;
revoke all on function public.post_announcement(uuid, text, text) from public;
grant execute on function public.post_announcement(uuid, text, text) to public;

-- Read helper: an organizer's own organizations, for the workspace switcher.
create function public.my_organizations() returns table(id uuid, slug text, name text, permissions text[]) language sql stable as $$
  select o.id, o.slug, o.name, m.permissions
  from public.organizations o
  join public.organization_members m on m.organization_id = o.id
  where m.user_id = public.current_user_id() and m.status = 'active'
  order by o.name
$$;
