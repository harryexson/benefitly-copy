-- Growth and Scale features. Every gated action checks organization_has_feature inside the database.

-- ===== Privilege escalation fix: invitations may only grant permissions the inviter holds =====
create or replace function public.caller_permissions(target_org uuid) returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce((select m.permissions from public.organization_members m
    where m.organization_id = target_org and m.user_id = public.current_user_id() and m.status = 'active'), '{}'::text[])
$$;
revoke all on function public.caller_permissions(uuid) from public;

create function public.assert_valid_permissions(perms text[]) returns void
language plpgsql immutable as $$
begin
  if not (perms <@ array['organization.manage','members.manage','finance.manage','benefits.manage','events.manage','communications.manage','payouts.approve']::text[]) then
    raise exception 'unknown permission requested';
  end if;
end;
$$;

create or replace function public.invite_to_organization(target_org uuid, invite_email text, perms text[] default '{}', number text default null, level text default null, valid_days integer default 14)
returns table(invitation_id uuid, token text) language plpgsql security definer set search_path = public as $$
declare raw_token text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''); created_id uuid;
begin
  if not public.has_permission(target_org, 'members.manage') then raise exception 'not authorized to invite members'; end if;
  perform public.assert_valid_permissions(perms);
  if not (perms <@ public.caller_permissions(target_org)) then raise exception 'cannot grant permissions you do not hold'; end if;
  insert into public.organization_invitations (organization_id, email, permissions, member_number, membership_level, token_hash, expires_at, invited_by)
  values (target_org, lower(trim(invite_email)), perms, number, level, encode(sha256(convert_to(raw_token, 'UTF8')), 'hex'), now() + make_interval(days => valid_days), public.current_user_id())
  returning id into created_id;
  return query select created_id, raw_token;
end;
$$;

-- ===== Feature catalogue =====
insert into public.feature_entitlements (feature, min_tier, description) values
  ('csv_reports', 'growth', 'Export members, dues, benefit claims and payouts as CSV'),
  ('email_reminders', 'growth', 'Email dues reminders to members'),
  ('custom_email_templates', 'growth', 'Customize the wording of reminder emails'),
  ('volunteer_management', 'growth', 'Volunteer opportunities and sign-ups'),
  ('bulk_payouts', 'growth', 'Initiate many benefit payouts in one request'),
  ('advanced_roles', 'growth', 'Saved roles with custom permission sets'),
  ('automated_reports', 'scale', 'Scheduled CSV report emails'),
  ('api_access', 'scale', 'Read-only API keys')
on conflict (feature) do nothing;

update public.subscription_plans set features = array['Up to 500 members', 'Everything in Starter, plus:', 'CSV exports', 'Email reminders and custom email templates', 'Volunteer management', 'Bulk benefit payouts', 'Advanced roles', 'Priority email support'] where tier = 'growth';
update public.subscription_plans set features = array['Up to 2,000 members', 'Everything in Growth, plus:', 'Scheduled report emails', 'API access'] where tier = 'scale';
update public.subscription_plans set features = array['Unlimited members', 'Everything in Scale', 'Custom contract terms'] where tier = 'enterprise';

-- ===== CSV reports =====
create function public.report_rows(target_org uuid, report_kind text) returns setof jsonb
language plpgsql security definer set search_path = public as $$
begin
  if report_kind = 'members' then
    return query select to_jsonb(r) from (
      select m.member_number, m.membership_level, m.status, m.joined_at, m.contact->>'name' as name, m.contact->>'email' as email
      from public.members m where m.organization_id = target_org order by m.member_number) r;
  elsif report_kind = 'dues' then
    return query select to_jsonb(r) from (
      select m.member_number, c.amount, c.currency, c.status, c.paid_at, c.created_at
      from public.member_contributions c join public.members m on m.id = c.member_id
      where c.organization_id = target_org order by c.created_at desc) r;
  elsif report_kind = 'benefit_claims' then
    return query select to_jsonb(r) from (
      select m.member_number, p.name as program, c.requested_amount, c.status, c.reason, c.created_at
      from public.benefit_claims c join public.members m on m.id = c.member_id join public.benefit_programs p on p.id = c.program_id
      where c.organization_id = target_org order by c.created_at desc) r;
  elsif report_kind = 'payouts' then
    return query select to_jsonb(r) from (
      select p.id, p.amount, p.currency, p.status, p.created_at, p.updated_at
      from public.payouts p where p.organization_id = target_org order by p.created_at desc) r;
  else
    raise exception 'unknown report: %', report_kind;
  end if;
end;
$$;
revoke all on function public.report_rows(uuid, text) from public;

create function public.organization_report(target_org uuid, report_kind text) returns setof jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not (public.has_permission(target_org, 'members.manage') or public.has_permission(target_org, 'finance.manage')) then
    raise exception 'not authorized to export reports';
  end if;
  if not public.organization_has_feature(target_org, 'csv_reports') then raise exception 'csv reports are not included in your plan'; end if;
  return query select * from public.report_rows(target_org, report_kind);
end;
$$;
revoke all on function public.organization_report(uuid, text) from public;
grant execute on function public.organization_report(uuid, text) to public;

-- ===== Email reminders and custom templates =====
create table public.email_templates (
  organization_id uuid not null references public.organizations(id),
  template_key text not null check (template_key in ('dues_reminder')),
  subject text not null check (char_length(subject) between 1 and 200),
  body text not null check (char_length(body) between 1 and 5000),
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  primary key (organization_id, template_key)
);
alter table public.email_templates enable row level security;
create policy email_templates_read on public.email_templates for select using (public.has_permission(organization_id, 'communications.manage'));
grant select on public.email_templates to benefitly_app;

create function public.upsert_email_template(target_org uuid, key text, template_subject text, template_body text)
returns public.email_templates language plpgsql security definer set search_path = public as $$
declare saved public.email_templates;
begin
  if not public.has_permission(target_org, 'communications.manage') then raise exception 'not authorized to edit email templates'; end if;
  if not public.organization_has_feature(target_org, 'custom_email_templates') then raise exception 'custom email templates are not included in your plan'; end if;
  insert into public.email_templates (organization_id, template_key, subject, body, updated_by)
  values (target_org, key, template_subject, template_body, public.current_user_id())
  on conflict (organization_id, template_key) do update set subject = excluded.subject, body = excluded.body, updated_by = excluded.updated_by, updated_at = now()
  returning * into saved;
  return saved;
end;
$$;
revoke all on function public.upsert_email_template(uuid, text, text, text) from public;
grant execute on function public.upsert_email_template(uuid, text, text, text) to public;

-- Returns the organization's custom template only while its plan includes custom templates.
create function public.organization_email_template(target_org uuid, key text)
returns table(subject text, body text) language plpgsql security definer set search_path = public as $$
begin
  if not (public.has_permission(target_org, 'communications.manage') or public.has_permission(target_org, 'finance.manage')) then
    raise exception 'not authorized to read email templates';
  end if;
  if not public.organization_has_feature(target_org, 'custom_email_templates') then return; end if;
  return query select t.subject, t.body from public.email_templates t where t.organization_id = target_org and t.template_key = key;
end;
$$;
revoke all on function public.organization_email_template(uuid, text) from public;
grant execute on function public.organization_email_template(uuid, text) to public;

-- Members with a contact email and no paid dues in the past twelve months (annual dues cycle).
create function public.dues_reminder_recipients(target_org uuid)
returns table(member_id uuid, member_name text, email text, organization_name text)
language plpgsql security definer set search_path = public as $$
begin
  if not (public.has_permission(target_org, 'finance.manage') or public.has_permission(target_org, 'communications.manage')) then
    raise exception 'not authorized to send reminders';
  end if;
  if not public.organization_has_feature(target_org, 'email_reminders') then raise exception 'email reminders are not included in your plan'; end if;
  return query
    select m.id, coalesce(m.contact->>'name', m.member_number), m.contact->>'email', o.name
    from public.members m join public.organizations o on o.id = m.organization_id
    where m.organization_id = target_org and m.status = 'active' and m.contact->>'email' is not null
      and not exists (
        select 1 from public.member_contributions c
        where c.member_id = m.id and c.status = 'paid' and c.paid_at > now() - interval '12 months'
      );
end;
$$;
revoke all on function public.dues_reminder_recipients(uuid) from public;
grant execute on function public.dues_reminder_recipients(uuid) to public;

-- ===== Volunteer management =====
create table public.volunteer_opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  title text not null check (char_length(title) between 3 and 160),
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  capacity integer check (capacity is null or capacity > 0),
  created_at timestamptz not null default now()
);
create table public.volunteer_signups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  opportunity_id uuid not null references public.volunteer_opportunities(id),
  member_id uuid not null references public.members(id),
  status text not null default 'confirmed' check (status in ('confirmed', 'canceled')),
  created_at timestamptz not null default now(),
  unique (opportunity_id, member_id)
);
alter table public.volunteer_opportunities enable row level security;
alter table public.volunteer_signups enable row level security;
create policy volunteer_opportunities_read on public.volunteer_opportunities for select using (public.is_org_member(organization_id));
create policy volunteer_signups_read on public.volunteer_signups for select using (public.has_permission(organization_id, 'events.manage') or exists (
  select 1 from public.members m where m.id = member_id and m.user_id = public.current_user_id()));
grant select on public.volunteer_opportunities, public.volunteer_signups to benefitly_app;

create function public.create_volunteer_opportunity(target_org uuid, opp_title text, opp_description text, starts timestamptz, ends timestamptz, opp_location text, opp_capacity integer)
returns public.volunteer_opportunities language plpgsql security definer set search_path = public as $$
declare created public.volunteer_opportunities;
begin
  if not public.has_permission(target_org, 'events.manage') then raise exception 'not authorized to manage volunteer opportunities'; end if;
  if not public.organization_has_feature(target_org, 'volunteer_management') then raise exception 'volunteer management is not included in your plan'; end if;
  insert into public.volunteer_opportunities (organization_id, title, description, starts_at, ends_at, location, capacity)
  values (target_org, opp_title, opp_description, starts, ends, opp_location, opp_capacity)
  returning * into created;
  return created;
end;
$$;
revoke all on function public.create_volunteer_opportunity(uuid, text, text, timestamptz, timestamptz, text, integer) from public;
grant execute on function public.create_volunteer_opportunity(uuid, text, text, timestamptz, timestamptz, text, integer) to public;

-- A member signs up themselves, or a manager signs them up. Capacity is checked under a row lock.
create function public.volunteer_sign_up(target_opportunity uuid, target_member uuid)
returns public.volunteer_signups language plpgsql security definer set search_path = public as $$
declare opp public.volunteer_opportunities; mem public.members; taken integer; result public.volunteer_signups;
begin
  select * into opp from public.volunteer_opportunities where id = target_opportunity for update;
  if opp.id is null then raise exception 'opportunity not found'; end if;
  select * into mem from public.members where id = target_member and organization_id = opp.organization_id;
  if mem.id is null then raise exception 'member does not belong to this organization'; end if;
  if mem.user_id is distinct from public.current_user_id() and not public.has_permission(opp.organization_id, 'events.manage') then
    raise exception 'not authorized to sign this member up';
  end if;
  if not public.organization_has_feature(opp.organization_id, 'volunteer_management') then raise exception 'volunteer management is not included in your plan'; end if;
  if mem.status <> 'active' then raise exception 'only active members can volunteer'; end if;

  if exists (select 1 from public.volunteer_signups s where s.opportunity_id = opp.id and s.member_id = mem.id and s.status = 'confirmed') then
    raise exception 'already signed up for this opportunity';
  end if;
  if opp.capacity is not null then
    select count(*) into taken from public.volunteer_signups s where s.opportunity_id = opp.id and s.status = 'confirmed';
    if taken >= opp.capacity then raise exception 'this opportunity is full'; end if;
  end if;

  insert into public.volunteer_signups (organization_id, opportunity_id, member_id, status)
  values (opp.organization_id, opp.id, mem.id, 'confirmed')
  on conflict (opportunity_id, member_id) do update set status = 'confirmed'
  returning * into result;
  return result;
end;
$$;
revoke all on function public.volunteer_sign_up(uuid, uuid) from public;
grant execute on function public.volunteer_sign_up(uuid, uuid) to public;

create function public.volunteer_cancel(target_signup uuid) returns public.volunteer_signups
language plpgsql security definer set search_path = public as $$
declare signup public.volunteer_signups; owner_id uuid; result public.volunteer_signups;
begin
  select * into signup from public.volunteer_signups where id = target_signup;
  if signup.id is null then raise exception 'signup not found'; end if;
  select user_id into owner_id from public.members where id = signup.member_id;
  if owner_id is distinct from public.current_user_id() and not public.has_permission(signup.organization_id, 'events.manage') then
    raise exception 'not authorized to cancel this signup';
  end if;
  update public.volunteer_signups set status = 'canceled' where id = target_signup returning * into result;
  return result;
end;
$$;
revoke all on function public.volunteer_cancel(uuid) from public;
grant execute on function public.volunteer_cancel(uuid) to public;

create function public.volunteer_opportunity_counts(target_org uuid)
returns table(id uuid, title text, starts_at timestamptz, location text, capacity integer, confirmed_count bigint)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_org_member(target_org) then raise exception 'not a member of this organization'; end if;
  if not public.organization_has_feature(target_org, 'volunteer_management') then raise exception 'volunteer management is not included in your plan'; end if;
  return query
    select o.id, o.title, o.starts_at, o.location, o.capacity,
      (select count(*) from public.volunteer_signups s where s.opportunity_id = o.id and s.status = 'confirmed')
    from public.volunteer_opportunities o where o.organization_id = target_org order by o.starts_at;
end;
$$;
revoke all on function public.volunteer_opportunity_counts(uuid) from public;
grant execute on function public.volunteer_opportunity_counts(uuid) to public;

-- ===== Bulk benefit payouts =====
create function public.initiate_benefit_payouts(claim_ids uuid[], source_account uuid)
returns setof public.payouts language plpgsql security definer set search_path = public as $$
declare target_org uuid; claim uuid;
begin
  if coalesce(array_length(claim_ids, 1), 0) = 0 then raise exception 'no claims given'; end if;
  if array_length(claim_ids, 1) > 100 then raise exception 'bulk payouts are limited to 100 claims per batch'; end if;
  select organization_id into target_org from public.benefit_claims where id = claim_ids[1];
  if target_org is null then raise exception 'claim not found'; end if;
  if not public.organization_has_feature(target_org, 'bulk_payouts') then raise exception 'bulk payouts are not included in your plan'; end if;
  if exists (select 1 from unnest(claim_ids) c join public.benefit_claims bc on bc.id = c where bc.organization_id <> target_org) then
    raise exception 'all claims in a batch must belong to one organization';
  end if;
  foreach claim in array claim_ids loop
    return next public.initiate_benefit_payout(claim, source_account, md5(claim::text || source_account::text)::uuid);
  end loop;
end;
$$;
revoke all on function public.initiate_benefit_payouts(uuid[], uuid) from public;
grant execute on function public.initiate_benefit_payouts(uuid[], uuid) to public;

-- ===== Advanced roles =====
create table public.organization_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  name text not null check (char_length(name) between 2 and 60),
  permissions text[] not null default '{}',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);
alter table public.organization_roles enable row level security;
create policy organization_roles_read on public.organization_roles for select using (public.has_permission(organization_id, 'members.manage') or public.has_permission(organization_id, 'organization.manage'));
grant select on public.organization_roles to benefitly_app;

create function public.create_organization_role(target_org uuid, role_name text, perms text[])
returns public.organization_roles language plpgsql security definer set search_path = public as $$
declare created public.organization_roles;
begin
  if not public.has_permission(target_org, 'organization.manage') then raise exception 'not authorized to manage roles'; end if;
  if not public.organization_has_feature(target_org, 'advanced_roles') then raise exception 'advanced roles are not included in your plan'; end if;
  perform public.assert_valid_permissions(perms);
  if not (perms <@ public.caller_permissions(target_org)) then raise exception 'cannot create a role with permissions you do not hold'; end if;
  insert into public.organization_roles (organization_id, name, permissions, created_by)
  values (target_org, role_name, perms, public.current_user_id())
  returning * into created;
  return created;
end;
$$;
revoke all on function public.create_organization_role(uuid, text, text[]) from public;
grant execute on function public.create_organization_role(uuid, text, text[]) to public;

create function public.assign_organization_role(target_org uuid, target_user uuid, target_role uuid)
returns public.organization_members language plpgsql security definer set search_path = public as $$
declare role public.organization_roles; result public.organization_members;
begin
  if not public.has_permission(target_org, 'organization.manage') then raise exception 'not authorized to assign roles'; end if;
  if not public.organization_has_feature(target_org, 'advanced_roles') then raise exception 'advanced roles are not included in your plan'; end if;
  select * into role from public.organization_roles where id = target_role and organization_id = target_org;
  if role.id is null then raise exception 'role not found'; end if;
  if not (role.permissions <@ public.caller_permissions(target_org)) then raise exception 'cannot assign a role with permissions you do not hold'; end if;
  update public.organization_members set permissions = role.permissions
  where organization_id = target_org and user_id = target_user and status = 'active'
  returning * into result;
  if result.user_id is null then raise exception 'person is not an active member of this organization'; end if;
  return result;
end;
$$;
revoke all on function public.assign_organization_role(uuid, uuid, uuid) from public;
grant execute on function public.assign_organization_role(uuid, uuid, uuid) to public;

-- ===== Scheduled report emails (sent by the cron route) =====
create table public.report_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  report_kind text not null check (report_kind in ('members', 'dues', 'benefit_claims', 'payouts')),
  recipient_email text not null check (position('@' in recipient_email) > 1),
  frequency text not null check (frequency in ('weekly', 'monthly')),
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  last_sent_at timestamptz
);
alter table public.report_schedules enable row level security;
create policy report_schedules_read on public.report_schedules for select using (public.has_permission(organization_id, 'finance.manage') or public.has_permission(organization_id, 'members.manage'));
grant select on public.report_schedules to benefitly_app;

create function public.create_report_schedule(target_org uuid, kind text, recipient text, freq text)
returns public.report_schedules language plpgsql security definer set search_path = public as $$
declare created public.report_schedules;
begin
  if not (public.has_permission(target_org, 'finance.manage') or public.has_permission(target_org, 'members.manage')) then raise exception 'not authorized to schedule reports'; end if;
  if not public.organization_has_feature(target_org, 'automated_reports') then raise exception 'automated reports are not included in your plan'; end if;
  insert into public.report_schedules (organization_id, report_kind, recipient_email, frequency, created_by)
  values (target_org, kind, lower(trim(recipient)), freq, public.current_user_id())
  returning * into created;
  return created;
end;
$$;
revoke all on function public.create_report_schedule(uuid, text, text, text) from public;
grant execute on function public.create_report_schedule(uuid, text, text, text) to public;

-- Cron-only: no user context, so it is granted to the app role alone and re-checks the plan.
create function public.due_report_schedules() returns setof public.report_schedules
language sql security definer set search_path = public as $$
  select s.* from public.report_schedules s
  where s.active
    and public.organization_has_feature(s.organization_id, 'automated_reports')
    and (s.last_sent_at is null or s.last_sent_at < now() - case when s.frequency = 'weekly' then interval '7 days' else interval '30 days' end)
$$;
revoke all on function public.due_report_schedules() from public;
grant execute on function public.due_report_schedules() to benefitly_app;

create function public.mark_report_sent(target_schedule uuid) returns void
language sql security definer set search_path = public as $$
  update public.report_schedules set last_sent_at = now() where id = target_schedule
$$;
revoke all on function public.mark_report_sent(uuid) from public;
grant execute on function public.mark_report_sent(uuid) to benefitly_app;

create function public.schedule_report_rows(target_org uuid, report_kind text) returns setof jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.organization_has_feature(target_org, 'automated_reports') then raise exception 'automated reports are not included in your plan'; end if;
  return query select * from public.report_rows(target_org, report_kind);
end;
$$;
revoke all on function public.schedule_report_rows(uuid, text) from public;
grant execute on function public.schedule_report_rows(uuid, text) to benefitly_app;

-- ===== API keys (read-only) =====
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  name text not null check (char_length(name) between 2 and 80),
  key_prefix text not null,
  key_hash text not null unique,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_used_at timestamptz
);
alter table public.api_keys enable row level security;
create policy api_keys_read on public.api_keys for select using (public.has_permission(organization_id, 'organization.manage'));
grant select on public.api_keys to benefitly_app;

create function public.create_api_key(target_org uuid, key_name text, prefix text, hash text)
returns public.api_keys language plpgsql security definer set search_path = public as $$
declare created public.api_keys;
begin
  if not public.has_permission(target_org, 'organization.manage') then raise exception 'not authorized to manage API keys'; end if;
  if not public.organization_has_feature(target_org, 'api_access') then raise exception 'API access is not included in your plan'; end if;
  insert into public.api_keys (organization_id, name, key_prefix, key_hash, created_by)
  values (target_org, key_name, prefix, hash, public.current_user_id())
  returning * into created;
  return created;
end;
$$;
revoke all on function public.create_api_key(uuid, text, text, text) from public;
grant execute on function public.create_api_key(uuid, text, text, text) to public;

create function public.revoke_api_key(target_org uuid, target_key uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_permission(target_org, 'organization.manage') then raise exception 'not authorized to manage API keys'; end if;
  update public.api_keys set revoked_at = now() where id = target_key and organization_id = target_org and revoked_at is null;
  if not found then raise exception 'API key not found or already revoked'; end if;
end;
$$;
revoke all on function public.revoke_api_key(uuid, uuid) from public;
grant execute on function public.revoke_api_key(uuid, uuid) to public;

-- Called by the API route with no user session: the key hash is the credential.
create function public.api_list_members(target_org uuid, key_hash_value text) returns setof jsonb
language plpgsql security definer set search_path = public as $$
declare key_row public.api_keys;
begin
  select * into key_row from public.api_keys k
  where k.key_hash = key_hash_value and k.organization_id = target_org and k.revoked_at is null;
  if key_row.id is null then raise exception 'invalid API key'; end if;
  if not public.organization_has_feature(target_org, 'api_access') then raise exception 'API access is not included in your plan'; end if;
  update public.api_keys set last_used_at = now() where id = key_row.id;
  return query select * from public.report_rows(target_org, 'members');
end;
$$;
revoke all on function public.api_list_members(uuid, text) from public;
grant execute on function public.api_list_members(uuid, text) to benefitly_app;
