-- Member lifecycle, dues and benefit payout records. Money never leaves Stripe: dues are direct
-- charges to the organization's connected account, and member payouts are created here as
-- pending records only. The Stripe transfer step is wired separately and is not performed by any
-- function in this file.

-- ===== Payout approval: org executives with payouts.approve, never the requester =====

create or replace function public.approve_payout(target_payout uuid)
returns public.payouts language plpgsql security definer set search_path = public as $$
declare existing public.payouts; result public.payouts;
begin
  select * into existing from public.payouts where id = target_payout;
  if existing.id is null then raise exception 'payout not found'; end if;
  if not (public.is_platform_admin() or (existing.organization_id is not null and public.has_permission(existing.organization_id, 'payouts.approve'))) then
    raise exception 'not authorized to approve payouts';
  end if;
  if existing.requested_by = public.current_user_id() then raise exception 'a payout must be approved by someone other than its requester'; end if;
  update public.payouts set status = 'approved', approved_by = public.current_user_id(), updated_at = now()
  where id = target_payout and status in ('pending', 'verification_required')
  returning * into result;
  if result.id is null then raise exception 'payout is not awaiting approval'; end if;
  return result;
end;
$$;

create or replace function public.mark_payout_executed(target_payout uuid, provider_payout_id text, new_status public.payout_status)
returns public.payouts language plpgsql security definer set search_path = public as $$
declare result public.payouts; payout_org uuid;
begin
  select organization_id into payout_org from public.payouts where id = target_payout;
  if not (public.is_platform_admin() or (payout_org is not null and public.has_permission(payout_org, 'payouts.approve'))) then
    raise exception 'not authorized to update payouts';
  end if;
  update public.payouts set status = new_status, provider_payout_id = mark_payout_executed.provider_payout_id, updated_at = now()
  where id = target_payout and status = 'approved'
  returning * into result;
  if result.benefit_claim_id is not null and new_status = 'paid' then
    update public.benefit_claims set status = 'paid' where id = result.benefit_claim_id;
  end if;
  return result;
end;
$$;

create or replace function public.mark_payout_failed(target_payout uuid) returns public.payouts
language plpgsql security definer set search_path = public as $$
declare result public.payouts; payout_org uuid;
begin
  select organization_id into payout_org from public.payouts where id = target_payout;
  if not (public.is_platform_admin() or (payout_org is not null and public.has_permission(payout_org, 'payouts.approve'))) then
    raise exception 'not authorized to update payouts';
  end if;
  update public.payouts set status = 'failed', updated_at = now() where id = target_payout and status = 'approved' returning * into result;
  return result;
end;
$$;

-- ===== Organization invitations =====

create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  email text not null check (email = lower(email)),
  permissions text[] not null default '{}',
  member_number text,
  membership_level text,
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  expires_at timestamptz not null,
  invited_by uuid not null references public.profiles(id),
  accepted_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);
alter table public.organization_invitations enable row level security;
create policy organization_invitations_manager_read on public.organization_invitations for select
  using (public.has_permission(organization_id, 'members.manage'));
grant select on public.organization_invitations to benefitly_app;

create function public.invite_to_organization(target_org uuid, invite_email text, perms text[] default '{}', number text default null, level text default null, valid_days integer default 14)
returns table(invitation_id uuid, token text) language plpgsql security definer set search_path = public as $$
declare raw_token text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''); created_id uuid;
begin
  if not public.has_permission(target_org, 'members.manage') then raise exception 'not authorized to invite members'; end if;
  if not (perms <@ array['organization.manage','members.manage','finance.manage','benefits.manage','events.manage','communications.manage','payouts.approve']::text[]) then
    raise exception 'unknown permission requested';
  end if;
  insert into public.organization_invitations (organization_id, email, permissions, member_number, membership_level, token_hash, expires_at, invited_by)
  values (target_org, lower(trim(invite_email)), perms, number, level, encode(sha256(convert_to(raw_token, 'UTF8')), 'hex'), now() + make_interval(days => valid_days), public.current_user_id())
  returning id into created_id;
  return query select created_id, raw_token;
end;
$$;
revoke all on function public.invite_to_organization(uuid, text, text[], text, text, integer) from public;
grant execute on function public.invite_to_organization(uuid, text, text[], text, text, integer) to public;

create function public.accept_organization_invitation(invite_token text)
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
revoke all on function public.accept_organization_invitation(text) from public;
grant execute on function public.accept_organization_invitation(text) to public;

create function public.revoke_organization_invitation(target_org uuid, target_invitation uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_permission(target_org, 'members.manage') then raise exception 'not authorized to revoke invitations'; end if;
  update public.organization_invitations set status = 'revoked' where id = target_invitation and organization_id = target_org and status = 'pending';
  if not found then raise exception 'invitation is not pending'; end if;
end;
$$;
revoke all on function public.revoke_organization_invitation(uuid, uuid) from public;
grant execute on function public.revoke_organization_invitation(uuid, uuid) to public;

-- ===== Member payout accounts (a member's own Stripe connected account; no bank details here) =====

create table public.member_payout_accounts (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null unique references public.members(id),
  organization_id uuid not null references public.organizations(id),
  user_id uuid not null references public.profiles(id),
  provider text not null check (provider in ('stripe_connect')),
  provider_account_id text not null unique,
  status text not null default 'pending' check (status in ('pending', 'verified', 'restricted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.member_payout_accounts enable row level security;
create policy member_payout_accounts_read on public.member_payout_accounts for select
  using (user_id = public.current_user_id() or public.has_permission(organization_id, 'finance.manage'));
grant select on public.member_payout_accounts to benefitly_app;

create function public.upsert_member_payout_account(target_member uuid, account_provider text, provider_account text)
returns public.member_payout_accounts language plpgsql security definer set search_path = public as $$
declare target_org uuid; owner_id uuid; result public.member_payout_accounts;
begin
  select organization_id, user_id into target_org, owner_id from public.members where id = target_member;
  if owner_id is distinct from public.current_user_id() then raise exception 'not authorized to manage this payout account'; end if;
  insert into public.member_payout_accounts (member_id, organization_id, user_id, provider, provider_account_id)
  values (target_member, target_org, owner_id, account_provider, provider_account)
  on conflict (member_id) do update set provider_account_id = excluded.provider_account_id, updated_at = now()
  returning * into result;
  return result;
end;
$$;
revoke all on function public.upsert_member_payout_account(uuid, text, text) from public;
grant execute on function public.upsert_member_payout_account(uuid, text, text) to public;

create function public.update_member_payout_account_status(account_provider text, provider_account text, new_status text)
returns public.member_payout_accounts language sql security definer set search_path = public as $$
  update public.member_payout_accounts set status = new_status, updated_at = now()
  where provider = account_provider and provider_account_id = provider_account
  returning *
$$;
revoke all on function public.update_member_payout_account_status(text, text, text) from public;
grant execute on function public.update_member_payout_account_status(text, text, text) to public;

-- ===== Benefit payouts: a pending payout record per approved claim =====

alter table public.payouts
  add column benefit_claim_id uuid references public.benefit_claims(id),
  add column recipient_account_id uuid references public.member_payout_accounts(id),
  add constraint payouts_has_source check (campaign_id is not null or benefit_claim_id is not null),
  add constraint payouts_benefit_has_recipient check (benefit_claim_id is null or recipient_account_id is not null);

create unique index payouts_one_live_benefit_payout on public.payouts (benefit_claim_id)
  where benefit_claim_id is not null and status not in ('failed', 'canceled', 'reversed');

create function public.initiate_benefit_payout(target_claim uuid, source_account uuid, idempotency uuid)
returns public.payouts language plpgsql security definer set search_path = public as $$
declare claim public.benefit_claims; recipient uuid; result public.payouts;
begin
  select * into claim from public.benefit_claims where id = target_claim;
  if claim.id is null then raise exception 'claim not found'; end if;
  if not (public.has_permission(claim.organization_id, 'benefits.manage') or public.has_permission(claim.organization_id, 'finance.manage')) then
    raise exception 'not authorized to initiate payouts';
  end if;
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
revoke all on function public.initiate_benefit_payout(uuid, uuid, uuid) from public;
grant execute on function public.initiate_benefit_payout(uuid, uuid, uuid) to public;

-- ===== Member dues: a pending contribution keyed by the provider payment reference =====

create function public.create_member_dues_payment(target_member uuid, contribution_type_name text, amount_value integer, currency_code char(3), payment_reference text)
returns public.member_contributions language plpgsql security definer set search_path = public as $$
declare target_org uuid; owner_id uuid; kind_id uuid; result public.member_contributions;
begin
  select organization_id, user_id into target_org, owner_id from public.members where id = target_member;
  if owner_id is distinct from public.current_user_id() then raise exception 'not authorized to pay dues for this member'; end if;
  select id into kind_id from public.contribution_types where organization_id = target_org and name = contribution_type_name;
  if kind_id is null then
    insert into public.contribution_types (organization_id, name, kind) values (target_org, contribution_type_name, 'dues') returning id into kind_id;
  end if;
  insert into public.member_contributions (organization_id, member_id, contribution_type_id, amount, currency, status, payment_reference)
  values (target_org, target_member, kind_id, amount_value, currency_code, 'pending', payment_reference)
  returning * into result;
  return result;
end;
$$;
revoke all on function public.create_member_dues_payment(uuid, text, integer, char(3), text) from public;
grant execute on function public.create_member_dues_payment(uuid, text, integer, char(3), text) to public;

create function public.settle_member_dues(payment_reference text)
returns public.member_contributions language sql security definer set search_path = public as $$
  update public.member_contributions set status = 'paid', paid_at = now()
  where payment_reference = settle_member_dues.payment_reference and status = 'pending'
  returning *
$$;
revoke all on function public.settle_member_dues(text) from public;
grant execute on function public.settle_member_dues(text) to public;

create function public.fail_member_dues(payment_reference text)
returns public.member_contributions language sql security definer set search_path = public as $$
  update public.member_contributions set status = 'failed'
  where payment_reference = fail_member_dues.payment_reference and status = 'pending'
  returning *
$$;
revoke all on function public.fail_member_dues(text) from public;
grant execute on function public.fail_member_dues(text) to public;
