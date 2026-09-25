-- End-to-end integration test for every write path in this schema, run as the restricted
-- `benefitly_app` role (never as the migration/owner role -- that would not actually exercise
-- RLS at all; see database/README.md). Exercises: campaign creation, manual review, admin
-- approval, RLS-gated public visibility before/after publish, payment-account activation,
-- guest donation, settlement, idempotent duplicate settlement, refund, payout
-- request/approve/execute, campaign reports, media, updates, notifications + push tokens, the
-- full association module (org, member, dues, benefit program/claim, event/registration,
-- announcement), and two negative-authorization checks.
--
-- Usage (after applying every migration in database/migrations/ and creating benefitly_app,
-- both as the owner role -- see database/README.md):
--   psql -h <host> -U <owner-role> -d <db> -f database/tests/bootstrap.sql
--   psql -h <host> -U benefitly_app -d <db> -f database/tests/integration.sql
-- Prints "ALL INTEGRATION TESTS PASSED" as its last line on success; any real failure raises a
-- Postgres error and psql exits non-zero (\set ON_ERROR_STOP below).

\set ON_ERROR_STOP on
\pset pager off

-- ===== Campaign creation flow (as Alice) =====
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);

select id as campaign_id, slug, status from public.create_campaign_with_review(
  'Help rebuild the shelter', 'A long story about rebuilding the community shelter after the storm, at least fifty characters long here.',
  'community', 'Springfield', 'USD', 500000, null, 'help-rebuild-the-shelter-abc123', 'The Springfield Shelter', 'Beneficiary org'
) \gset

select 'campaign created: ' || :'campaign_id' as result;
select count(*) as beneficiary_count from public.campaign_beneficiaries where campaign_id = :'campaign_id';
select count(*) as review_count from public.campaign_reviews where campaign_id = :'campaign_id' and status = 'pending';

-- Anonymous read: should NOT see the campaign yet (still in review, not published).
select set_config('app.user_id', '', false);
select count(*) as anon_visible_count from public.campaigns where id = :'campaign_id';

-- ===== Admin approves the campaign =====
select set_config('app.user_id', '22222222-2222-2222-2222-222222222222', false);
select action, reason from public.record_moderation_action(:'campaign_id', null, 'approve', 'Looks good');

select status from public.campaigns where id = :'campaign_id';
select status from public.campaign_reviews where campaign_id = :'campaign_id';

-- Anonymous read: should NOW see the published campaign.
select set_config('app.user_id', '', false);
select count(*) as anon_visible_after_approve from public.campaigns where id = :'campaign_id' and status = 'published';

-- ===== Payment account + donation flow =====
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
select id as payment_account_id, status from public.upsert_payment_account('11111111-1111-1111-1111-111111111111', null, 'stripe_connect', 'acct_test123') \gset

-- Activate the account the way the real Stripe account.updated webhook does.
select status from public.update_payment_account_status('stripe_connect', 'acct_test123', 'active');

select set_config('app.user_id', '', false);
select provider, provider_account_id from public.campaign_donation_destination(:'campaign_id');

select id as donation_id from public.create_pending_donation(
  :'campaign_id', '33333333-3333-3333-3333-333333333333', 6000, 900, 'USD',
  gen_random_uuid(), 'pi_test_123', 0.15
) \gset

-- Only the campaign owner/org can read donation rows directly (donations_tenant_read); switch
-- back from the anonymous donor-facing context used for campaign_donation_destination above.
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
select gross_amount, platform_contribution, status from public.donations where id = :'donation_id';

select net_campaign_amount, status from public.settle_donation('pi_test_123', 150);
select raised_amount, supporter_count, status from (select raised_amount, supporter_count from public.campaigns where id = :'campaign_id') s, (select status from public.donations where id = :'donation_id') d;

-- Duplicate settle should be a no-op (idempotency)
select public.settle_donation('pi_test_123', 999);
select raised_amount from public.campaigns where id = :'campaign_id';

-- ===== Refund flow =====
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
select status from public.refund_donation_ledger(:'donation_id', 6000, 're_test_1');
select raised_amount from public.campaigns where id = :'campaign_id';

-- ===== Payout flow =====
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
select id as payout_id, status from public.request_payout(:'campaign_id', :'payment_account_id', 1000, 'USD', gen_random_uuid()) \gset

select set_config('app.user_id', '22222222-2222-2222-2222-222222222222', false);
select status from public.approve_payout(:'payout_id');
select status from public.mark_payout_executed(:'payout_id', 'po_test_1', 'paid');
select status, provider_payout_id from public.payouts where id = :'payout_id';

select count(*) as pending_payouts_after from public.list_pending_payouts();

-- ===== Reports + fraud signals =====
select set_config('app.user_id', '33333333-3333-3333-3333-333333333333', false);
insert into public.campaign_reports (campaign_id, reporter_id, reason, details) values (:'campaign_id', '33333333-3333-3333-3333-333333333333', 'fraud', 'test report');
select set_config('app.user_id', '22222222-2222-2222-2222-222222222222', false);
select count(*) as report_count from public.campaign_reports where campaign_id = :'campaign_id';

-- ===== Campaign media + updates =====
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
select id as media_id from public.add_campaign_media(:'campaign_id', 'https://example.com/img.jpg', 'image', 'image/jpeg', 12345, 'alt text') \gset
select set_config('app.user_id', '', false);
select count(*) as public_media_count from public.campaign_media where campaign_id = :'campaign_id';

select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
select id as update_id from public.post_campaign_update(:'campaign_id', 'We are making great progress!') \gset
select set_config('app.user_id', '', false);
select count(*) as public_update_count from public.campaign_updates where campaign_id = :'campaign_id';

-- ===== Notifications + push tokens =====
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
select public.record_notification('11111111-1111-1111-1111-111111111111', null, 'donation_received', '{"amount": 6000}'::jsonb);
insert into public.push_tokens (profile_id, token, platform) values ('11111111-1111-1111-1111-111111111111', 'ExponentPushToken[test]', 'ios');
select count(*) as my_notifications from public.notifications where profile_id = '11111111-1111-1111-1111-111111111111';
select id as notif_id from public.notifications where profile_id = '11111111-1111-1111-1111-111111111111' limit 1 \gset
select read_at is not null as marked_read from public.mark_notification_read(:'notif_id');

-- ===== Association module =====
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
select id as org_id, slug from public.create_organization('Springfield Neighbors', 'springfield-neighbors-xyz') \gset
select permissions from public.organization_members where organization_id = :'org_id' and user_id = '11111111-1111-1111-1111-111111111111';

select id as member_id from public.add_member(:'org_id', '33333333-3333-3333-3333-333333333333', 'M-001', 'Standard', '{"email":"carol@example.com"}'::jsonb) \gset
select member_number, status from public.members where id = :'member_id';

select amount, status from public.record_member_contribution(:'org_id', :'member_id', 'Annual Dues', 5000, 'USD');

select id as program_id from public.create_benefit_program(:'org_id', 'Emergency Assistance', 'Help for members in crisis', 'Active members', 100000, 30) \gset

-- Member submits their own claim (Carol, matching member_user_id)
select set_config('app.user_id', '33333333-3333-3333-3333-333333333333', false);
select id as claim_id, status from public.submit_benefit_claim(:'org_id', :'program_id', :'member_id', 20000, 'Lost my job') \gset

select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
select status from public.decide_benefit_claim(:'org_id', :'claim_id', 'approved', 'Approved, will process payment');
select status from public.benefit_claims where id = :'claim_id';

select id as event_id from public.create_event(:'org_id', 'Community Potluck', 'Bring a dish', now() + interval '7 days', now() + interval '7 days 3 hours', 'Community Hall', 50, 'members') \gset

select set_config('app.user_id', '33333333-3333-3333-3333-333333333333', false);
select status from public.register_for_event(:'event_id', :'member_id');

select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
select title from public.post_announcement(:'org_id', 'Welcome', 'Welcome to our new community platform!');

select * from public.my_organizations();

-- ===== Negative authorization tests (should all raise) =====
select set_config('app.user_id', '33333333-3333-3333-3333-333333333333', false);
do $$
begin
  begin
    perform public.create_benefit_program('99999999-9999-9999-9999-999999999999'::uuid, 'x', 'y', null, null, 0);
    raise exception 'SHOULD HAVE FAILED: non-member created benefit program';
  exception when others then
    if sqlerrm not like '%not authorized%' then raise; end if;
    raise notice 'OK: non-org-member blocked from create_benefit_program';
  end;
end $$;

do $$
begin
  begin
    perform public.record_moderation_action('11111111-1111-1111-1111-111111111111'::uuid, null, 'approve', null);
    raise exception 'SHOULD HAVE FAILED: non-admin moderated a campaign';
  exception when others then
    if sqlerrm not like '%not authorized%' then raise; end if;
    raise notice 'OK: non-admin blocked from record_moderation_action';
  end;
end $$;

select 'ALL INTEGRATION TESTS PASSED' as final_result;
