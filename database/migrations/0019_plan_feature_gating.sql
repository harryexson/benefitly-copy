-- Plan feature gating, enforced in the database. Every gated action checks the organization's
-- effective tier, which is its plan unless the subscription has been canceled (then free). Platform
-- admins can still grant a plan directly (admin_set_organization_plan), which is how comped
-- organizations are handled.

-- Only list features the platform actually provides. Growth and Scale currently differ from
-- Starter only by member limit; no further features are claimed for them.
update public.subscription_plans set features = array['Up to 25 members', 'Member invitations by email', 'Donations with optional donor tips', 'Campaigns, events and ticket sales', 'Community email support'] where tier = 'free';
update public.subscription_plans set features = array['Up to 100 members', 'Everything in Free, plus:', 'Member dues collection through Stripe', 'Benefit programs and approved payouts'] where tier = 'starter';
update public.subscription_plans set features = array['Up to 500 members', 'Everything in Starter, plus:', 'Priority email support'] where tier = 'growth';
update public.subscription_plans set features = array['Up to 2,000 members', 'Everything in Growth'] where tier = 'scale';
update public.subscription_plans set features = array['Unlimited members', 'Everything in Scale', 'Custom contract terms'] where tier = 'enterprise';

create table public.feature_entitlements (
  feature text primary key,
  min_tier text not null references public.subscription_plans(tier),
  description text not null
);
alter table public.feature_entitlements enable row level security;
create policy feature_entitlements_public_read on public.feature_entitlements for select using (true);
grant select on public.feature_entitlements to benefitly_app;

insert into public.feature_entitlements (feature, min_tier, description) values
  ('member_dues_checkout', 'starter', 'Members pay dues by card through Stripe'),
  ('benefit_programs', 'starter', 'Create benefit programs and decide claims'),
  ('benefit_payouts', 'starter', 'Initiate payouts of approved benefit claims');

create function public.organization_effective_tier(target_org uuid) returns text
language sql stable security definer set search_path = public as $$
  select case when o.subscription_status = 'canceled' then 'free' else o.plan_tier end
  from public.organizations o where o.id = target_org
$$;
revoke all on function public.organization_effective_tier(uuid) from public;
grant execute on function public.organization_effective_tier(uuid) to benefitly_app;

create function public.organization_has_feature(target_org uuid, feature_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.feature_entitlements fe
    join public.subscription_plans req on req.tier = fe.min_tier
    join public.subscription_plans cur on cur.tier = public.organization_effective_tier(target_org)
    where fe.feature = feature_name and cur.sort_order >= req.sort_order
  )
$$;
revoke all on function public.organization_has_feature(uuid, text) from public;
grant execute on function public.organization_has_feature(uuid, text) to benefitly_app;

create function public.organization_member_limit(target_org uuid) returns integer
language sql stable security definer set search_path = public as $$
  select p.member_limit from public.subscription_plans p where p.tier = public.organization_effective_tier(target_org)
$$;
revoke all on function public.organization_member_limit(uuid) from public;
grant execute on function public.organization_member_limit(uuid) to benefitly_app;

-- Enforces the member limit in one place for every path that adds an active member.
create function public.assert_member_capacity(target_org uuid) returns void
language plpgsql security definer set search_path = public as $$
declare current_count integer; plan_limit integer;
begin
  select count(*) into current_count from public.members where organization_id = target_org and status = 'active';
  plan_limit := public.organization_member_limit(target_org);
  if plan_limit is not null and current_count >= plan_limit then
    raise exception 'member limit reached for your plan (% of % members) -- upgrade your plan to add more', current_count, plan_limit;
  end if;
end;
$$;
revoke all on function public.assert_member_capacity(uuid) from public;

create or replace function public.add_member(target_org uuid, member_user_id uuid, number text, level text, contact_info jsonb)
returns public.members language plpgsql security definer set search_path = public as $$
declare inserted public.members;
begin
  if not public.has_permission(target_org, 'members.manage') then raise exception 'not authorized to manage members'; end if;
  perform public.assert_member_capacity(target_org);
  insert into public.members (organization_id, user_id, member_number, membership_level, contact, status, joined_at)
  values (target_org, member_user_id, number, level, coalesce(contact_info, '{}'::jsonb), 'active', now())
  returning * into inserted;
  return inserted;
end;
$$;

create or replace function public.accept_organization_invitation(invite_token text)
returns public.organization_members language plpgsql security definer set search_path = public as $$
declare inv public.organization_invitations; signed_in_email text; result public.organization_members;
begin
  if public.current_user_id() is null then raise exception 'sign in required'; end if;
  select * into inv from public.organization_invitations
  where token_hash = encode(sha256(convert_to(invite_token, 'UTF8')), 'hex') and status = 'pending' and expires_at > now()
  for update;
  if inv.id is null then raise exception 'invitation is invalid or expired'; end if;
  select lower(email) into signed_in_email from public.profiles where id = public.current_user_id();
  if signed_in_email is distinct from inv.email then raise exception 'invitation was issued to a different email address'; end if;

  if not exists (select 1 from public.members where organization_id = inv.organization_id and user_id = public.current_user_id()) then
    perform public.assert_member_capacity(inv.organization_id);
  end if;

  insert into public.organization_members (organization_id, user_id, status, permissions, joined_at)
  values (inv.organization_id, public.current_user_id(), 'active', inv.permissions, now())
  on conflict (organization_id, user_id) do update
    set status = 'active', permissions = excluded.permissions, joined_at = coalesce(public.organization_members.joined_at, now())
  returning * into result;

  if not exists (select 1 from public.members where organization_id = inv.organization_id and user_id = public.current_user_id()) then
    insert into public.members (organization_id, user_id, member_number, membership_level, contact, status, joined_at)
    values (inv.organization_id, public.current_user_id(),
      coalesce(inv.member_number, 'M-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
      inv.membership_level, jsonb_build_object('email', inv.email), 'active', now());
  end if;

  update public.organization_invitations set status = 'accepted', accepted_by = public.current_user_id(), accepted_at = now() where id = inv.id;
  return result;
end;
$$;

create or replace function public.create_benefit_program(target_org uuid, program_name text, program_description text, eligibility_text text, max_amount integer, waiting_days integer)
returns public.benefit_programs language plpgsql security definer set search_path = public as $$
declare inserted public.benefit_programs;
begin
  if not public.has_permission(target_org, 'benefits.manage') then raise exception 'not authorized to manage benefit programs'; end if;
  if not public.organization_has_feature(target_org, 'benefit_programs') then raise exception 'benefit programs are not included in your plan'; end if;
  insert into public.benefit_programs (organization_id, name, description, eligibility, maximum_amount, waiting_period_days)
  values (target_org, program_name, program_description, eligibility_text, max_amount, coalesce(waiting_days, 0))
  returning * into inserted;
  return inserted;
end;
$$;

create or replace function public.initiate_benefit_payout(target_claim uuid, source_account uuid, idempotency uuid)
returns public.payouts language plpgsql security definer set search_path = public as $$
declare claim public.benefit_claims; recipient uuid; result public.payouts;
begin
  select * into claim from public.benefit_claims where id = target_claim;
  if claim.id is null then raise exception 'claim not found'; end if;
  if not (public.has_permission(claim.organization_id, 'benefits.manage') or public.has_permission(claim.organization_id, 'finance.manage')) then
    raise exception 'not authorized to initiate payouts';
  end if;
  if not public.organization_has_feature(claim.organization_id, 'benefit_payouts') then raise exception 'benefit payouts are not included in your plan'; end if;
  if claim.status <> 'approved' then raise exception 'claim is not approved'; end if;
  if not exists (select 1 from public.payment_accounts where id = source_account and organization_id = claim.organization_id) then
    raise exception 'source account does not belong to this organization';
  end if;
  select mpa.id into recipient from public.member_payout_accounts mpa
  where mpa.member_id = claim.member_id and mpa.status = 'verified';
  if recipient is null then raise exception 'member has no verified payout account'; end if;

  insert into public.payouts (organization_id, benefit_claim_id, recipient_account_id, payment_account_id, amount, currency, requested_by, idempotency_key)
  values (claim.organization_id, claim.id, recipient, source_account, claim.requested_amount, 'USD', public.current_user_id(), idempotency)
  on conflict (idempotency_key) do update set status = public.payouts.status
  returning * into result;
  return result;
end;
$$;

create or replace function public.member_dues_destination(target_member uuid)
returns table(provider_account_id text) language plpgsql security definer set search_path = public as $$
declare owner_id uuid; target_org uuid;
begin
  select user_id, organization_id into owner_id, target_org from public.members where id = target_member;
  if owner_id is distinct from public.current_user_id() then raise exception 'not authorized to pay dues for this member'; end if;
  if not public.organization_has_feature(target_org, 'member_dues_checkout') then raise exception 'member dues checkout is not included in your plan'; end if;
  return query
    select pa.provider_account_id from public.payment_accounts pa
    where pa.organization_id = target_org and pa.provider = 'stripe_connect' and pa.status = 'active'
    limit 1;
end;
$$;

create or replace function public.create_member_dues_payment(target_member uuid, contribution_type_name text, amount_value integer, currency_code char(3), provider_reference text)
returns public.member_contributions language plpgsql security definer set search_path = public as $$
declare target_org uuid; owner_id uuid; kind_id uuid; result public.member_contributions;
begin
  select organization_id, user_id into target_org, owner_id from public.members where id = target_member;
  if owner_id is distinct from public.current_user_id() then raise exception 'not authorized to pay dues for this member'; end if;
  if not public.organization_has_feature(target_org, 'member_dues_checkout') then raise exception 'member dues checkout is not included in your plan'; end if;
  select id into kind_id from public.contribution_types where organization_id = target_org and name = contribution_type_name;
  if kind_id is null then
    insert into public.contribution_types (organization_id, name, kind) values (target_org, contribution_type_name, 'dues') returning id into kind_id;
  end if;
  insert into public.member_contributions (organization_id, member_id, contribution_type_id, amount, currency, status, payment_reference)
  values (target_org, target_member, kind_id, amount_value, currency_code, 'pending', provider_reference)
  on conflict (payment_reference) where payment_reference is not null
  do update set payment_reference = excluded.payment_reference
  returning * into result;
  return result;
end;
$$;
