-- Crowdfunding trust, moderation, risk and payment-event tables.
-- All organization-scoped tables are protected by `is_org_member` from 0001.
-- Platform-scoped trust tables are protected by `is_platform_admin` defined below.

create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
create type public.report_reason as enum ('fraud', 'misuse_of_funds', 'inappropriate_content', 'impersonation', 'duplicate', 'other');
create type public.moderation_action_type as enum ('approve', 'reject', 'request_changes', 'pause', 'resume', 'remove', 'restore', 'note');
create type public.campaign_review_status as enum ('pending', 'approved', 'rejected', 'changes_requested');

create table public.platform_admins (
  profile_id uuid primary key references public.profiles(id),
  role text not null default 'admin' check (role in ('admin', 'support', 'risk', 'finance')),
  granted_by uuid references public.profiles(id),
  granted_at timestamptz not null default now()
);

-- security definer: same reasoning as is_org_member (0001) -- called from RLS policies
-- evaluated as arbitrary querying roles, which have no direct grant on platform_admins.
create function public.is_platform_admin() returns boolean language sql stable security definer set search_path = public as
  $$ select exists (select 1 from public.platform_admins where profile_id = public.current_user_id()) $$;

-- payment_accounts (0002) carries no public-read policy: donors are never org members, so a
-- guest checkout cannot select from it directly. This function exposes only the minimum needed
-- to route a donation charge -- provider + connected-account id -- and only for a campaign that
-- is publicly published and whose account is active, never the full payment_accounts row.
create function public.campaign_donation_destination(target_campaign uuid)
returns table(provider text, provider_account_id text) language sql stable security definer set search_path = public as $$
  select pa.provider, pa.provider_account_id
  from public.campaigns c
  join public.payment_accounts pa
    on (pa.owner_id = c.owner_id and pa.organization_id is null)
    or (c.organization_id is not null and pa.organization_id = c.organization_id)
  where c.id = target_campaign and c.status = 'published' and pa.status = 'active'
  limit 1
$$;
revoke all on function public.campaign_donation_destination(uuid) from public;
grant execute on function public.campaign_donation_destination(uuid) to public;

-- Manual campaign approval queue (Phase 1: every campaign is approved manually).
create table public.campaign_reviews (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id),
  status public.campaign_review_status not null default 'pending',
  submitted_by uuid not null references public.profiles(id),
  reviewed_by uuid references public.profiles(id),
  notes text,
  submitted_at timestamptz not null default now(),
  decided_at timestamptz
);
create index campaign_reviews_status_idx on public.campaign_reviews (status, submitted_at);
create unique index campaign_reviews_pending_idx on public.campaign_reviews (campaign_id) where status = 'pending';

create table public.campaign_reports (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id),
  reporter_id uuid references public.profiles(id),
  reason public.report_reason not null,
  details text,
  status public.report_status not null default 'open',
  resolved_by uuid references public.profiles(id),
  resolution_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index campaign_reports_campaign_idx on public.campaign_reports (campaign_id, status);
create index campaign_reports_status_idx on public.campaign_reports (status, created_at desc);

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id),
  report_id uuid references public.campaign_reports(id),
  actor_id uuid not null references public.profiles(id),
  action public.moderation_action_type not null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index moderation_actions_campaign_idx on public.moderation_actions (campaign_id, created_at desc);

-- Risk/fraud signals attach to any subject (campaign, donation, payout, payment_account).
create table public.fraud_signals (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('campaign', 'donation', 'payout', 'payment_account', 'profile')),
  subject_id uuid not null,
  signal_type text not null,
  severity text not null default 'low' check (severity in ('low', 'medium', 'high', 'critical')),
  score numeric,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id)
);
create index fraud_signals_subject_idx on public.fraud_signals (subject_type, subject_id);
create index fraud_signals_open_idx on public.fraud_signals (severity, created_at desc) where resolved_at is null;

-- Durable, provider-agnostic webhook ledger. Every inbound event is stored once before processing.
create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('stripe_connect', 'adyen_platforms')),
  provider_event_id text not null,
  event_type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text,
  unique (provider, provider_event_id)
);
create index webhook_events_unprocessed_idx on public.webhook_events (provider, received_at) where processed_at is null;

-- Platform-contribution (tip) ledger, separate from the donation row so contribution rate
-- experiments and reconciliation never require mutating the immutable donation record.
create table public.platform_contributions (
  id uuid primary key default gen_random_uuid(),
  donation_id uuid not null references public.donations(id) unique,
  amount integer not null check (amount >= 0),
  currency char(3) not null,
  suggested_rate numeric not null,
  provider_transfer_id text,
  created_at timestamptz not null default now()
);

-- Idempotency store for outbound provider calls (onboarding, payouts, payment intents).
create table public.idempotent_requests (
  idempotency_key uuid primary key,
  scope text not null,
  request_hash text not null,
  response jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Donations and ledger_entries have all client privileges revoked (0001): only these
-- security-definer functions may create or settle them, so every gross/net/fee/currency figure
-- is computed server-side from the campaign's own state, never taken from request input.

create function public.create_pending_donation(
  target_campaign uuid, donor uuid, gross_amount integer, platform_contribution integer, currency_code char(3),
  donation_idempotency_key uuid, donation_provider_payment_id text, suggested_rate numeric
) returns public.donations language plpgsql security definer set search_path = public as $$
declare inserted public.donations;
begin
  if not exists (select 1 from public.campaigns where id = target_campaign and status = 'published') then
    raise exception 'campaign % is not accepting donations', target_campaign;
  end if;
  insert into public.donations (campaign_id, donor_id, gross_amount, platform_contribution, processor_fee, net_campaign_amount, currency, status, idempotency_key, provider_payment_id)
  values (target_campaign, donor, gross_amount, platform_contribution, 0, gross_amount - platform_contribution, currency_code, 'pending', donation_idempotency_key, donation_provider_payment_id)
  on conflict (idempotency_key) do update set provider_payment_id = excluded.provider_payment_id
  returning * into inserted;
  if platform_contribution > 0 then
    insert into public.platform_contributions (donation_id, amount, currency, suggested_rate)
    values (inserted.id, platform_contribution, currency_code, suggested_rate)
    on conflict (donation_id) do nothing;
  end if;
  return inserted;
end;
$$;
revoke all on function public.create_pending_donation(uuid, uuid, integer, integer, char(3), uuid, text, numeric) from public;
grant execute on function public.create_pending_donation(uuid, uuid, integer, integer, char(3), uuid, text, numeric) to public;

-- Idempotent by design: only transitions a 'pending' donation, so a duplicate webhook delivery
-- (the same provider_payment_id settled twice) is a no-op rather than double-crediting a campaign.
create function public.settle_donation(provider_payment_id text, processor_fee_amount integer) returns public.donations language plpgsql security definer set search_path = public as $$
declare updated public.donations;
begin
  update public.donations set status = 'succeeded', processor_fee = processor_fee_amount, net_campaign_amount = gross_amount - platform_contribution - processor_fee_amount
  where donations.provider_payment_id = settle_donation.provider_payment_id and status = 'pending'
  returning * into updated;
  if updated.id is null then return updated; end if;
  update public.campaigns set raised_amount = raised_amount + updated.net_campaign_amount, supporter_count = supporter_count + 1 where id = updated.campaign_id;
  insert into public.ledger_entries (organization_id, campaign_id, donation_id, event_type, amount, currency, metadata)
  select c.organization_id, updated.campaign_id, updated.id, 'donation_settled', updated.net_campaign_amount, updated.currency, jsonb_build_object('grossAmount', updated.gross_amount, 'platformContribution', updated.platform_contribution, 'processorFee', updated.processor_fee)
  from public.campaigns c where c.id = updated.campaign_id;
  return updated;
end;
$$;
revoke all on function public.settle_donation(text, integer) from public;
grant execute on function public.settle_donation(text, integer) to public;

create function public.fail_donation(provider_payment_id text) returns public.donations language sql security definer set search_path = public as $$
  update public.donations set status = 'failed' where donations.provider_payment_id = fail_donation.provider_payment_id and status = 'pending' returning *
$$;
revoke all on function public.fail_donation(text) from public;
grant execute on function public.fail_donation(text) to public;

-- payment_accounts (0002) has RLS enabled with no policies at all, so every access -- including
-- the organizer's own onboarding write -- must go through this explicit, self-checked function
-- rather than a blanket policy that would otherwise need to special-case "insert my own account".
create function public.upsert_payment_account(owner uuid, organization uuid, account_provider text, account_provider_account_id text)
returns public.payment_accounts language plpgsql security definer set search_path = public as $$
declare result public.payment_accounts;
begin
  if public.current_user_id() is distinct from owner and not (organization is not null and public.is_org_member(organization)) then
    raise exception 'not authorized to manage this payment account';
  end if;
  insert into public.payment_accounts (organization_id, owner_id, provider, provider_account_id, status)
  values (organization, owner, account_provider, account_provider_account_id, 'pending')
  on conflict (provider, provider_account_id) do update set status = public.payment_accounts.status
  returning * into result;
  return result;
end;
$$;
revoke all on function public.upsert_payment_account(uuid, uuid, text, text) from public;
grant execute on function public.upsert_payment_account(uuid, uuid, text, text) to public;

create function public.get_own_payment_account(owner uuid, organization uuid) returns public.payment_accounts language sql stable security definer set search_path = public as $$
  select * from public.payment_accounts
  where (owner_id = owner and organization_id is null and (owner = public.current_user_id()))
     or (organization is not null and organization_id = organization and public.is_org_member(organization))
  limit 1
$$;
revoke all on function public.get_own_payment_account(uuid, uuid) from public;
grant execute on function public.get_own_payment_account(uuid, uuid) to public;

-- moderation_actions has a read policy for admins but no insert policy at all: recording a
-- decision must go through this function so the admin check, the review-queue update and the
-- campaign status transition happen atomically and only an admin can trigger any of it.
create function public.record_moderation_action(target_campaign uuid, target_report uuid, decision public.moderation_action_type, decision_reason text)
returns public.moderation_actions language plpgsql security definer set search_path = public as $$
declare inserted public.moderation_actions; new_campaign_status public.campaign_status;
begin
  if not public.is_platform_admin() then raise exception 'not authorized to moderate campaigns'; end if;

  insert into public.moderation_actions (campaign_id, report_id, actor_id, action, reason)
  values (target_campaign, target_report, public.current_user_id(), decision, decision_reason)
  returning * into inserted;

  if target_report is not null then
    update public.campaign_reports set status = 'resolved', resolved_by = public.current_user_id(), resolution_note = decision_reason, resolved_at = now()
    where id = target_report;
  end if;

  new_campaign_status := case decision
    when 'approve' then 'published'
    when 'reject' then 'draft'
    when 'pause' then 'paused'
    when 'resume' then 'published'
    when 'remove' then 'draft'
    else null
  end;
  if new_campaign_status is not null then
    update public.campaigns set status = new_campaign_status, published_at = case when new_campaign_status = 'published' then now() else published_at end where id = target_campaign;
  end if;
  if decision in ('approve', 'reject', 'request_changes') then
    update public.campaign_reviews set status = (case decision when 'approve' then 'approved' when 'reject' then 'rejected' else 'changes_requested' end)::public.campaign_review_status,
      reviewed_by = public.current_user_id(), notes = decision_reason, decided_at = now()
    where campaign_id = target_campaign and status = 'pending';
  end if;

  return inserted;
end;
$$;
revoke all on function public.record_moderation_action(uuid, uuid, public.moderation_action_type, text) from public;
grant execute on function public.record_moderation_action(uuid, uuid, public.moderation_action_type, text) to public;

-- webhook_events has no client policies at all (correct: only the server-side webhook handler,
-- after signature verification, may write here). Returns false when the (provider, event id)
-- pair was already recorded, so the caller can skip re-processing a duplicate delivery.
create function public.ingest_webhook_event(event_provider text, event_id text, event_kind text, event_payload jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  insert into public.webhook_events (provider, provider_event_id, event_type, payload)
  values (event_provider, event_id, event_kind, event_payload)
  on conflict (provider, provider_event_id) do nothing;
  return found;
end;
$$;
revoke all on function public.ingest_webhook_event(text, text, text, jsonb) from public;
grant execute on function public.ingest_webhook_event(text, text, text, jsonb) to public;

create function public.mark_webhook_event_processed(event_provider text, event_id text, error_message text default null)
returns void language sql security definer set search_path = public as $$
  update public.webhook_events set processed_at = now(), processing_error = error_message where provider = event_provider and provider_event_id = event_id
$$;
revoke all on function public.mark_webhook_event_processed(text, text, text) from public;
grant execute on function public.mark_webhook_event_processed(text, text, text) to public;

-- payouts (0002) has a read policy but no insert policy: an organizer or org finance manager
-- requests a payout through this function, which checks authorization itself before inserting.
create function public.request_payout(target_campaign uuid, account uuid, payout_amount integer, payout_currency char(3), payout_idempotency_key uuid)
returns public.payouts language plpgsql security definer set search_path = public as $$
declare result public.payouts; campaign_owner uuid; campaign_org uuid;
begin
  select owner_id, organization_id into campaign_owner, campaign_org from public.campaigns where id = target_campaign;
  if campaign_owner is distinct from public.current_user_id() and not (campaign_org is not null and public.is_org_member(campaign_org)) then
    raise exception 'not authorized to request a payout for this campaign';
  end if;
  insert into public.payouts (organization_id, campaign_id, payment_account_id, amount, currency, requested_by, idempotency_key)
  values (campaign_org, target_campaign, account, payout_amount, payout_currency, public.current_user_id(), payout_idempotency_key)
  on conflict (idempotency_key) do update set status = public.payouts.status
  returning * into result;
  return result;
end;
$$;
revoke all on function public.request_payout(uuid, uuid, integer, char(3), uuid) from public;
grant execute on function public.request_payout(uuid, uuid, integer, char(3), uuid) to public;

-- Refunds are always organizer/admin-initiated against a settled donation, never a client input
-- amount trusted at face value: the function re-derives the campaign impact from the donation row.
create function public.refund_donation_ledger(donation uuid, refund_amount integer, provider_refund_id text)
returns public.donations language plpgsql security definer set search_path = public as $$
declare updated public.donations; campaign_owner uuid; campaign_org uuid; target_campaign uuid;
begin
  select d.campaign_id, c.owner_id, c.organization_id into target_campaign, campaign_owner, campaign_org
  from public.donations d join public.campaigns c on c.id = d.campaign_id where d.id = donation;
  if campaign_owner is distinct from public.current_user_id() and not (campaign_org is not null and public.is_org_member(campaign_org)) and not public.is_platform_admin() then
    raise exception 'not authorized to refund this donation';
  end if;
  update public.donations set status = 'refunded' where id = donation and status = 'succeeded' returning * into updated;
  if updated.id is null then raise exception 'donation is not in a refundable state'; end if;
  update public.campaigns set raised_amount = greatest(0, raised_amount - refund_amount) where id = target_campaign;
  insert into public.ledger_entries (organization_id, campaign_id, donation_id, event_type, amount, currency, metadata)
  values (campaign_org, target_campaign, donation, 'donation_refunded', -refund_amount, updated.currency, jsonb_build_object('providerRefundId', provider_refund_id));
  return updated;
end;
$$;
revoke all on function public.refund_donation_ledger(uuid, integer, text) from public;
grant execute on function public.refund_donation_ledger(uuid, integer, text) to public;

alter table public.platform_admins enable row level security;
alter table public.campaign_reviews enable row level security;
alter table public.campaign_reports enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.fraud_signals enable row level security;
alter table public.webhook_events enable row level security;
alter table public.platform_contributions enable row level security;
alter table public.idempotent_requests enable row level security;

create policy platform_admins_self_read on public.platform_admins for select using (profile_id = public.current_user_id() or public.is_platform_admin());
create policy campaign_reviews_read on public.campaign_reviews for select using (
  public.is_platform_admin()
  or exists (select 1 from public.campaigns c where c.id = campaign_id and (c.owner_id = public.current_user_id() or (c.organization_id is not null and public.is_org_member(c.organization_id))))
);
create policy campaign_reports_insert on public.campaign_reports for insert with check (reporter_id = public.current_user_id() or reporter_id is null);
create policy campaign_reports_read on public.campaign_reports for select using (
  public.is_platform_admin()
  or reporter_id = public.current_user_id()
  or exists (select 1 from public.campaigns c where c.id = campaign_id and (c.owner_id = public.current_user_id() or (c.organization_id is not null and public.is_org_member(c.organization_id))))
);
create policy moderation_actions_admin_read on public.moderation_actions for select using (public.is_platform_admin());
create policy fraud_signals_admin_read on public.fraud_signals for select using (public.is_platform_admin());
create policy platform_contributions_tenant_read on public.platform_contributions for select using (
  public.is_platform_admin()
  or exists (select 1 from public.donations d join public.campaigns c on c.id = d.campaign_id where d.id = donation_id and (c.owner_id = public.current_user_id() or (c.organization_id is not null and public.is_org_member(c.organization_id))))
);

revoke insert, update, delete on public.campaign_reviews, public.moderation_actions, public.fraud_signals, public.webhook_events, public.platform_contributions, public.idempotent_requests from public;
revoke update, delete on public.campaign_reports from public;
