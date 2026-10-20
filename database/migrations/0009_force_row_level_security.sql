-- Critical fix: row level security is silently bypassed by the table owner (and always by
-- superusers), and this repo's own migrations -- like most single-role Neon setups -- run as,
-- and were meant to be connected to by the app as, that same owner role. Verified against a
-- real, non-superuser owner role: a raw `insert into campaigns (..., status) values (...,
-- 'draft')` with no `app.user_id` bound succeeded before this migration.
--
-- `FORCE ROW LEVEL SECURITY` looked like the fix, but it is not: this schema's write path is
-- built entirely on SECURITY DEFINER functions (create_campaign_with_review,
-- create_pending_donation, record_moderation_action, ...) that are owned by the same role that
-- owns the tables, precisely so they can bypass RLS after doing their own permission check in
-- PL/pgSQL. FORCE ROW LEVEL SECURITY applies to the owner unconditionally, including inside
-- functions that owner owns -- so it does not just close the raw-insert hole, it breaks every
-- one of those functions too (verified: create_campaign_with_review fails with "new row
-- violates row-level security policy for table campaigns" once FORCE is applied, even for an
-- authorized caller, because the INSERT it performs is now itself subject to RLS).
--
-- The correct fix is a second, non-owner role for the application to connect as. RLS applies
-- to a non-owner automatically with plain `ENABLE ROW LEVEL SECURITY` (no FORCE needed), while
-- the SECURITY DEFINER functions -- still owned by the table-owning role -- keep bypassing RLS
-- exactly as designed, regardless of which role calls them.
--
-- Deployment: run every file in this directory, and `better-auth`'s own schema migration
-- (`user`, `session`, `account`, `verification` -- see the grants below), as the database's
-- default/owner role. Set DATABASE_URL for the running application to a connection string for
-- `benefitly_app` instead, using the password you set below. Never use the owner role's
-- connection string for the application itself.

create role benefitly_app login password 'CHANGE_ME_SET_A_REAL_PASSWORD';
grant usage on schema public to benefitly_app;

grant select on
  public.campaigns, public.campaign_media, public.campaign_updates, public.campaign_beneficiaries,
  public.campaign_reports, public.campaign_reviews, public.donations, public.organizations,
  public.organization_members, public.members, public.benefit_programs, public.benefit_claims,
  public.events, public.event_registrations, public.announcements, public.notifications,
  public.payouts, public.payment_accounts, public.profiles
to benefitly_app;

grant insert on public.campaign_reports, public.push_tokens to benefitly_app;
grant delete on public.push_tokens to benefitly_app;
grant insert, update on public.profiles to benefitly_app;

-- Every write beyond the above goes through a SECURITY DEFINER function (already executable by
-- PUBLIC, which includes benefitly_app) rather than a direct table grant.

-- notify() (apps/web/lib/notifications.ts) looks up a profile's push tokens to deliver a
-- notification it is sending on the system's behalf -- not on behalf of that profile's own
-- session -- so it cannot rely on push_tokens_self_read (profile_id = current_user_id()), which
-- would see nothing outside that profile's own request. This is the one read the app performs
-- that legitimately needs to cross that boundary, so it gets its own narrow function instead of
-- a broad SELECT grant on push_tokens.
create function public.get_push_tokens_for_notification(target_profile uuid) returns setof text
language sql stable security definer set search_path = public as $$
  select token from public.push_tokens where profile_id = target_profile
$$;
revoke all on function public.get_push_tokens_for_notification(uuid) from public;
grant execute on function public.get_push_tokens_for_notification(uuid) to public;

-- claim_approvals never had RLS enabled at all (a real gap: reviewer decisions on benefit
-- claims -- who approved/denied and their note -- were unprotected, though it also has no
-- direct app grant, so this is defense in depth for a future direct read).
alter table public.claim_approvals enable row level security;
create policy claim_approvals_admin_read on public.claim_approvals for select using (
  exists (
    select 1 from public.benefit_claims c
    where c.id = claim_id and public.has_permission(c.organization_id, 'benefits.manage')
  )
);

-- Webhook-driven payment-account status update. Stripe/Adyen report onboarding completion
-- (charges/payouts enabled, or a disabled reason) asynchronously via webhook, not synchronously
-- during upsert_payment_account -- there was no function to apply that update at all, so an
-- organizer's payment_accounts row would stay 'pending' forever and the payout button (gated on
-- status = 'active') would never appear. No caller identity to check here: this is invoked only
-- from the signature-verified webhook handlers, not from a user-facing route.
create function public.update_payment_account_status(account_provider text, account_provider_account_id text, new_status text)
returns public.payment_accounts language sql security definer set search_path = public as $$
  update public.payment_accounts set status = new_status
  where provider = account_provider and provider_account_id = account_provider_account_id
  returning *
$$;
revoke all on function public.update_payment_account_status(text, text, text) from public;
grant execute on function public.update_payment_account_status(text, text, text) to public;

-- After running better-auth's own migration (creates "user", "session", "account",
-- "verification" -- see docs/PRODUCTION_READINESS.md), also run:
--   grant select, insert, update, delete on "user", "session", "account", "verification" to benefitly_app;
-- Those tables are better-auth-internal, have no row level security, and are not part of this
-- migration set because better-auth generates/owns their DDL itself.
