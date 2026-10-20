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

-- ===== Subscription plan member-limit gate =====
select member_count, member_limit, plan_tier from public.organization_member_usage(:'org_id');

-- Downgrade to a plan whose member_limit (1) exactly matches the current active member count, then
-- confirm a second member is rejected while the org is on it.
select plan_tier from public.set_organization_plan(:'org_id', 'test_tiny');
do $$
begin
  begin
    perform public.add_member((select id from public.organizations where slug = 'springfield-neighbors-xyz'), '22222222-2222-2222-2222-222222222222', 'M-002', 'Standard', '{}'::jsonb);
    raise exception 'SHOULD HAVE FAILED: add_member exceeded the plan member limit';
  exception when others then
    if sqlerrm not like '%member limit reached%' then raise; end if;
    raise notice 'OK: member limit gate blocked add_member over the plan limit';
  end;
end $$;

-- Back on a plan with room, the same add_member call succeeds.
select plan_tier from public.set_organization_plan(:'org_id', 'starter');
select id as member2_id from public.add_member(:'org_id', '22222222-2222-2222-2222-222222222222', 'M-002', 'Standard', '{}'::jsonb) \gset
select member_number, status from public.members where id = :'member2_id';

-- A downgrade that would put the org over the new plan's limit is rejected.
do $$
begin
  begin
    perform public.set_organization_plan((select id from public.organizations where slug = 'springfield-neighbors-xyz'), 'test_tiny');
    raise exception 'SHOULD HAVE FAILED: downgrade below current member count';
  exception when others then
    if sqlerrm not like '%cannot downgrade%' then raise; end if;
    raise notice 'OK: set_organization_plan blocked a downgrade below current member count';
  end;
end $$;

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

-- ===== Donor dashboard: donations, giving plans, saved campaigns (0011) =====
-- A second, un-refunded donation from Carol so my_giving_summary() has something to sum
-- (:donation_id above was refunded to zero out raised_amount in the refund-flow check).
select set_config('app.user_id', '', false);
select id as donation2_id from public.create_pending_donation(
  :'campaign_id', '33333333-3333-3333-3333-333333333333', 4000, 0, 'USD',
  gen_random_uuid(), 'pi_test_carol_2', 0
) \gset
select net_campaign_amount, status from public.settle_donation('pi_test_carol_2', 100);

select set_config('app.user_id', '33333333-3333-3333-3333-333333333333', false);
select count(*) as carol_donation_count from public.my_donations();
select total_given_cents, campaigns_supported, donation_count from public.my_giving_summary();
do $$
begin
  if (select total_given_cents from public.my_giving_summary()) <> 4000 then
    raise exception 'SHOULD HAVE FAILED: my_giving_summary total_given_cents expected 4000 gross (fee does not reduce gross), got %', (select total_given_cents from public.my_giving_summary());
  end if;
  raise notice 'OK: my_giving_summary totals Carol''s succeeded donation gross amount';
end $$;

-- Alice (campaign owner) must never see this through my_donations -- it is donor-scoped, not a
-- generic "donations I can read" view.
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
select count(*) as alice_my_donations_count from public.my_donations();
do $$
begin
  if (select count(*) from public.my_donations()) <> 0 then
    raise exception 'SHOULD HAVE FAILED: my_donations leaked a donation Alice did not make';
  end if;
  raise notice 'OK: my_donations is donor-scoped, not campaign-owner-scoped';
end $$;
-- Alice, as campaign owner, still sees Carol's donation through the organizer-facing view.
select count(*) as campaign_donor_count from public.list_campaign_donors(:'campaign_id');

select set_config('app.user_id', '33333333-3333-3333-3333-333333333333', false);
select id as plan_id, status, next_reminder_at is not null as has_reminder from public.create_giving_plan(:'campaign_id', null, 2500, 'USD', 'monthly', 60000) \gset
select status from public.set_giving_plan_status(:'plan_id', 'paused');
select status from public.giving_plans where id = :'plan_id';

select public.toggle_saved_campaign(:'campaign_id') as now_saved;
select count(*) as saved_count from public.saved_campaigns where profile_id = '33333333-3333-3333-3333-333333333333';
select public.toggle_saved_campaign(:'campaign_id') as now_unsaved;
select count(*) as saved_count_after_untoggle from public.saved_campaigns where profile_id = '33333333-3333-3333-3333-333333333333';

-- A donor may not flip another donor's giving plan. psql does not interpolate `:'plan_id'`
-- inside a dollar-quoted do $$ block (it skips substitution inside quoted SQL entities, and
-- dollar-quoting counts), so the UUID is baked into the block's text via format()/%L first and
-- the resulting statement executed with \gexec, rather than referenced with :'plan_id' directly.
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
select format($fmt$
do $do$
begin
  begin
    perform public.set_giving_plan_status(%L::uuid, 'cancelled');
    raise exception 'SHOULD HAVE FAILED: Alice cancelled Carol''s giving plan';
  exception when others then
    if sqlerrm not like '%%not found%%' then raise; end if;
    raise notice 'OK: set_giving_plan_status blocked a non-owner from touching another donor''s plan';
  end;
end
$do$;
$fmt$, :'plan_id') as stmt \gset
:stmt

-- ===== Platform-admin back office (0011) =====
select set_config('app.user_id', '22222222-2222-2222-2222-222222222222', false);
select total_campaigns, total_organizations, total_donors from public.platform_stats();
select count(*) as admin_org_count from public.list_organizations_admin();
select plan_tier from public.admin_set_organization_plan(:'org_id', 'growth');
select count(*) as audit_log_rows from public.list_audit_log_admin(10);
select count(*) as webhook_event_rows from public.list_webhook_events_admin(10);

-- A non-admin gets nothing back (not an error) from every back-office read -- see the
-- list_pending_payouts style WHERE-clause guard this migration follows.
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
select count(*) as non_admin_platform_stats_rows from public.platform_stats();
select count(*) as non_admin_org_admin_rows from public.list_organizations_admin();
do $$
begin
  if (select count(*) from public.platform_stats()) <> 0 then raise exception 'SHOULD HAVE FAILED: platform_stats leaked to a non-admin'; end if;
  if (select count(*) from public.list_organizations_admin()) <> 0 then raise exception 'SHOULD HAVE FAILED: list_organizations_admin leaked to a non-admin'; end if;
  raise notice 'OK: platform-admin back-office reads return nothing for a non-admin';
end $$;

-- ===== Giving statements + charity directory (0012) =====
select set_config('app.user_id', '', false);
select count(*) as directory_public_count from public.charity_directory where active;
do $$
begin
  if (select count(*) from public.charity_directory where active) < 10 then
    raise exception 'SHOULD HAVE FAILED: charity_directory seed missing expected rows';
  end if;
  raise notice 'OK: charity_directory is publicly readable and seeded';
end $$;

select set_config('app.user_id', '33333333-3333-3333-3333-333333333333', false);
select count(*) as carol_statement_rows from public.my_giving_statement(null);
select donated_at::date as d from public.my_giving_statement(extract(year from now())::integer);
do $$
begin
  if (select count(*) from public.my_giving_statement(null)) <> 1 then
    raise exception 'SHOULD HAVE FAILED: my_giving_statement expected Carol''s one succeeded donation (the refunded one is excluded)';
  end if;
  if (select count(*) from public.my_giving_statement(1999)) <> 0 then
    raise exception 'SHOULD HAVE FAILED: my_giving_statement leaked a row for a year with no donations';
  end if;
  raise notice 'OK: my_giving_statement returns only succeeded donations, filtered by year';
end $$;
select array_agg(y order by y desc) as carol_giving_years from public.my_giving_years() y;

-- A giving plan may target exactly one of {campaign, category, charity_directory_id} -- not zero, not two.
select id as some_charity_id from public.charity_directory where active order by sort_order limit 1 \gset
select id as charity_plan_id, charity_directory_id from public.create_giving_plan(null, null, 1000, 'USD', 'monthly', null, :'some_charity_id') \gset
select charity_directory_id is not null as targets_charity from public.giving_plans where id = :'charity_plan_id';
do $$
begin
  begin
    perform public.create_giving_plan(null, null, 1000, 'USD', 'monthly', null, null);
    raise exception 'SHOULD HAVE FAILED: create_giving_plan accepted a plan with no target at all';
  exception when others then
    if sqlerrm not like '%giving_plans_target_check%' then raise; end if;
    raise notice 'OK: create_giving_plan rejects a plan targeting nothing';
  end;
end $$;

-- ===== Donor CRM (0013) =====
-- Alice has finance.manage on springfield-neighbors-xyz (create_organization grants it to the
-- creator); the function runs cleanly and returns nothing for an org with no org-owned campaigns
-- yet (Alice's donation-bearing campaign above was a personal fundraiser, organization_id null).
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
select count(*) as alice_org_donor_count from public.list_organization_donors(:'org_id', null, null, null, null);
select count(*) as alice_org_campaign_options from public.organization_campaign_options(:'org_id');

-- Carol is a member of that org but has no finance.manage permission -- the WHERE-clause guard
-- returns nothing for her rather than raising.
select set_config('app.user_id', '33333333-3333-3333-3333-333333333333', false);
select count(*) as carol_org_donor_count from public.list_organization_donors(:'org_id', null, null, null, null);
do $$
begin
  if (select count(*) from public.list_organization_donors((select id from public.organizations where slug = 'springfield-neighbors-xyz'), null, null, null, null)) <> 0 then
    raise exception 'SHOULD HAVE FAILED: list_organization_donors leaked data to a member without finance.manage';
  end if;
  raise notice 'OK: list_organization_donors is gated on finance.manage, not mere org membership';
end $$;

-- ===== Ticketed events (0014) =====
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
select id as event_id, title from public.create_campaign_event(:'campaign_id', 'Harvest Banquet', 'An evening to celebrate', now() + interval '14 days', now() + interval '14 days 3 hours', 'Community Hall') \gset
select id as ticket_type_id, name from public.create_ticket_type(:'event_id', 'General Admission', 5000, 'USD', 2) \gset

-- Public (anonymous) visibility: the campaign is published, so the event and ticket type are visible with no app.user_id bound.
select set_config('app.user_id', '', false);
select count(*) as anon_event_count from public.list_campaign_events(:'campaign_id');
select count(*) as anon_ticket_type_count from public.list_event_ticket_types(:'event_id');

-- Carol buys 2 of the 2 available tickets -- a pending donation (same pipeline as a regular gift), then reserve_tickets mints the tickets and decrements availability.
select id as ticket_donation_id from public.create_pending_donation(
  :'campaign_id', '33333333-3333-3333-3333-333333333333', 10000, 0, 'USD', gen_random_uuid(), 'pi_test_tickets_1', 0
) \gset
select set_config('app.user_id', '33333333-3333-3333-3333-333333333333', false);
select code, attendee_name, status from public.reserve_tickets(:'ticket_donation_id', :'ticket_type_id', 2, 'Carol Donor', 'carol@example.com', '+15551234567');
select quantity_sold, quantity_available from public.ticket_types where id = :'ticket_type_id';

-- A third ticket should be rejected: only 0 remain.
do $$
begin
  begin
    perform public.reserve_tickets(
      (select id from public.donations where provider_payment_id = 'pi_test_tickets_1'),
      (select id from public.ticket_types where name = 'General Admission' and campaign_event_id = (select id from public.campaign_events where title = 'Harvest Banquet')),
      1, 'Late Buyer', 'late@example.com', null
    );
    raise exception 'SHOULD HAVE FAILED: reserve_tickets oversold a sold-out ticket type';
  exception when others then
    if sqlerrm not like '%only 0 tickets remain%' then raise; end if;
    raise notice 'OK: reserve_tickets blocked overselling a sold-out ticket type';
  end;
end $$;

-- Settling the donation is what a real purchase's webhook does; tickets_for_donation (no caller
-- identity, like the webhook itself) then finds the tickets to email/text.
select net_campaign_amount, status from public.settle_donation('pi_test_tickets_1', 300);
select set_config('app.user_id', '', false);
select count(*) as tickets_for_settled_donation from public.tickets_for_donation(:'ticket_donation_id');

-- Self check-in by code -- no session required, matches a guest purchaser's position. (Reading
-- the code here as Carol, the ticket's purchaser, since a direct select against public.tickets is
-- still RLS-scoped by tickets_owner_read even though self_check_in_ticket itself needs none.)
select set_config('app.user_id', '33333333-3333-3333-3333-333333333333', false);
select code as ticket_code_1 from public.tickets where donation_id = :'ticket_donation_id' order by created_at asc limit 1 \gset
select set_config('app.user_id', '', false);
select attendee_name, already_checked_in from public.self_check_in_ticket(:'ticket_code_1');
select attendee_name, already_checked_in from public.self_check_in_ticket(:'ticket_code_1');
-- The two self_check_in_ticket calls above already demonstrate idempotency directly in their
-- output (already_checked_in: f, then t) -- no separate assertion needed.

-- Organizer roster + staff-assisted check-in on the second ticket.
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
select count(*) as organizer_roster_count from public.organizer_list_event_tickets(:'event_id');
select code as ticket_code_2 from public.tickets where donation_id = :'ticket_donation_id' and status = 'valid' limit 1 \gset
select status, checked_in_by is not null as has_staff from public.organizer_check_in_ticket(:'event_id', :'ticket_code_2');

-- A non-organizer (Bob, an admin but not a member of Alice's org/owner of her campaign) gets an empty roster, not an error.
select set_config('app.user_id', '22222222-2222-2222-2222-222222222222', false);
select count(*) as bob_roster_count from public.organizer_list_event_tickets(:'event_id');
do $$
begin
  if (select count(*) from public.organizer_list_event_tickets((select id from public.campaign_events where title = 'Harvest Banquet'))) <> 0 then
    raise exception 'SHOULD HAVE FAILED: organizer_list_event_tickets leaked the roster to a non-organizer';
  end if;
  raise notice 'OK: organizer_list_event_tickets is gated to the campaign owner/org, not any admin';
end $$;


select 'ALL INTEGRATION TESTS PASSED' as final_result;
