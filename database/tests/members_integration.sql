-- Integration tests for migration 0015: invitations, member payout accounts, benefit payout
-- records, approval authority and member dues. Run as the restricted `benefitly_app` role, after
-- every migration in database/migrations/ has been applied and the fixtures in
-- members_fixtures.sql have been loaded (as the owner role).
--
--   psql -h <host> -U postgres -d <db> -f database/tests/members_fixtures.sql
--   psql -h <host> -U benefitly_app -d <db> -f database/tests/members_integration.sql
--
-- Every expected failure asserts the specific error message, so a failure for the wrong reason
-- (a typo, a missing setting) fails the suite instead of passing it. Prints
-- "MEMBER INTEGRATION TESTS PASSED" as the last line on success.

\set ON_ERROR_STOP on
\pset pager off

-- ===== Organization owned by Alice (holds every permission via create_organization) =====
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
select id as org_id from public.create_organization('Members Test Association', 'members-test-assoc') \gset
select set_config('test.org_id', :'org_id', false);
-- Benefit programs and dues checkout are Starter features; grant the test organization Starter
-- the way a comped account is granted, through the platform-admin override.
select set_config('app.user_id', '22222222-2222-2222-2222-222222222222', false);
select plan_tier as comped_plan from public.admin_set_organization_plan(current_setting('test.org_id')::uuid, 'starter');
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);

-- ===== Invitations =====
-- Eve (no permissions) cannot invite
select set_config('app.user_id', '55555555-5555-5555-5555-555555555555', false);
do $$ begin
  perform * from public.invite_to_organization(current_setting('test.org_id')::uuid, 'someone@example.com');
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%not authorized to invite members%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;

-- Alice invites Dana as a plain member with a member number; the email is normalized
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
select invitation_id as dana_invite_id, token as dana_token
from public.invite_to_organization(current_setting('test.org_id')::uuid, 'Dana@Example.com', '{}', 'D-100', 'standard') \gset
select set_config('test.dana_token', :'dana_token', false);
select email as stored_email from public.organization_invitations where id = :'dana_invite_id';

-- Invitation list: Alice (members.manage) sees it, Eve does not
select count(*) as alice_sees_invites from public.organization_invitations where organization_id = :'org_id';
select set_config('app.user_id', '55555555-5555-5555-5555-555555555555', false);
select count(*) as eve_sees_invites from public.organization_invitations where organization_id = :'org_id';

-- Eve cannot accept Dana's invitation: the signed-in email must match
do $$ begin
  perform * from public.accept_organization_invitation(current_setting('test.dana_token'));
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%different email address%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;

-- Dana accepts: active org membership plus a member record with her member number
select set_config('app.user_id', '44444444-4444-4444-4444-444444444444', false);
select status from public.accept_organization_invitation(current_setting('test.dana_token'));
select count(*) as dana_member_rows from public.members
where organization_id = current_setting('test.org_id')::uuid and user_id = '44444444-4444-4444-4444-444444444444' and member_number = 'D-100' and status = 'active';

-- Accepting the same token again fails
do $$ begin
  perform * from public.accept_organization_invitation(current_setting('test.dana_token'));
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%invalid or expired%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;

-- Revoked invitations cannot be accepted
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
select invitation_id as eve_invite_id, token as eve_token
from public.invite_to_organization(current_setting('test.org_id')::uuid, 'eve@example.com') \gset
select set_config('test.eve_token', :'eve_token', false);
select public.revoke_organization_invitation(current_setting('test.org_id')::uuid, :'eve_invite_id'::uuid);
select set_config('app.user_id', '55555555-5555-5555-5555-555555555555', false);
do $$ begin
  perform * from public.accept_organization_invitation(current_setting('test.eve_token'));
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%invalid or expired%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;

-- Unknown permission names are refused
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
do $$ begin
  perform * from public.invite_to_organization(current_setting('test.org_id')::uuid, 'z@example.com', array['root.everything']::text[]);
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%unknown permission%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;

-- ===== Approval authority: Grace holds benefits.manage only =====
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
select invitation_id as grace_invite_id, token as grace_token
from public.invite_to_organization(current_setting('test.org_id')::uuid, 'grace@example.com', array['benefits.manage']::text[]) \gset
select set_config('app.user_id', '66666666-6666-6666-6666-666666666666', false);
select status from public.accept_organization_invitation(:'grace_token');

-- Benefit program and claim for Dana's member record
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
select id as program_id from public.create_benefit_program(current_setting('test.org_id')::uuid, 'Emergency relief', 'One-time relief', 'Members in good standing', 100000, 0) \gset
select id as member_id from public.members where organization_id = current_setting('test.org_id')::uuid and member_number = 'D-100' \gset
select set_config('test.member_id', :'member_id', false);
select set_config('app.user_id', '44444444-4444-4444-4444-444444444444', false);
select id as claim_id from public.submit_benefit_claim(current_setting('test.org_id')::uuid, :'program_id'::uuid, :'member_id'::uuid, 50000, 'Flood damage') \gset
select set_config('test.claim_id', :'claim_id', false);
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
select status as claim_status_after_decision from public.decide_benefit_claim(current_setting('test.org_id')::uuid, :'claim_id'::uuid, 'approved', 'Verified');

-- Dana's payout account: Eve cannot register it, Dana can, and it is hidden from Eve
select set_config('app.user_id', '55555555-5555-5555-5555-555555555555', false);
do $$ begin
  perform * from public.upsert_member_payout_account(current_setting('test.member_id')::uuid, 'stripe_connect', 'acct_eve');
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%not authorized to manage this payout account%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;
select count(*) as eve_sees_dana_account from public.member_payout_accounts where member_id = current_setting('test.member_id')::uuid;

select set_config('app.user_id', '44444444-4444-4444-4444-444444444444', false);
select status from public.upsert_member_payout_account(current_setting('test.member_id')::uuid, 'stripe_connect', 'acct_test_dana');
select count(*) as dana_sees_own_account from public.member_payout_accounts where member_id = current_setting('test.member_id')::uuid;

-- The organization's connected account (the source of dues and benefit payouts)
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
select id as source_account_id from public.upsert_payment_account('11111111-1111-1111-1111-111111111111', current_setting('test.org_id')::uuid, 'stripe_connect', 'acct_test_org_members') \gset
select set_config('test.source_account_id', :'source_account_id', false);

-- Grace initiates, but nothing can be paid until Dana's account is verified
select set_config('app.user_id', '66666666-6666-6666-6666-666666666666', false);
do $$ begin
  perform * from public.initiate_benefit_payout(current_setting('test.claim_id')::uuid, current_setting('test.source_account_id')::uuid, gen_random_uuid());
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%no verified payout account%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;

-- Stripe confirms Dana's account (webhook path)
select status as account_status from public.update_member_payout_account_status('stripe_connect', 'acct_test_dana', 'verified');

-- Grace initiates the payout
select id as benefit_payout_id, status as initiated_status, amount as initiated_amount
from public.initiate_benefit_payout(current_setting('test.claim_id')::uuid, current_setting('test.source_account_id')::uuid, gen_random_uuid()) \gset
select set_config('test.benefit_payout_id', :'benefit_payout_id', false);

-- Grace cannot approve her own request
do $$ begin
  perform * from public.approve_payout(current_setting('test.benefit_payout_id')::uuid);
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%not authorized to approve payouts%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;

-- Eve cannot approve
select set_config('app.user_id', '55555555-5555-5555-5555-555555555555', false);
do $$ begin
  perform * from public.approve_payout(current_setting('test.benefit_payout_id')::uuid);
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%not authorized to approve payouts%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;

-- Alice (payouts.approve) approves a request she did not make
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
select status as approved_status from public.approve_payout(current_setting('test.benefit_payout_id')::uuid);

-- Execution is recorded and the claim moves to paid
select status as executed_status from public.mark_payout_executed(current_setting('test.benefit_payout_id')::uuid, 'tr_test_1', 'paid');
select status as claim_status_after_payment from public.benefit_claims where id = current_setting('test.claim_id')::uuid;

-- Requester cannot approve her own payout, even holding payouts.approve: Alice initiates a second one
select set_config('app.user_id', '44444444-4444-4444-4444-444444444444', false);
select id as claim2_id from public.submit_benefit_claim(current_setting('test.org_id')::uuid, :'program_id'::uuid, current_setting('test.member_id')::uuid, 20000, 'Medical bills') \gset
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
select status from public.decide_benefit_claim(current_setting('test.org_id')::uuid, :'claim2_id'::uuid, 'approved', 'Second claim verified');
select id as self_payout_id from public.initiate_benefit_payout(:'claim2_id'::uuid, current_setting('test.source_account_id')::uuid, gen_random_uuid()) \gset
select set_config('test.self_payout_id', :'self_payout_id', false);
do $$ begin
  perform * from public.approve_payout(current_setting('test.self_payout_id')::uuid);
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%approved by someone other than its requester%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;

-- A paid claim cannot be initiated again
select set_config('app.user_id', '66666666-6666-6666-6666-666666666666', false);
do $$ begin
  perform * from public.initiate_benefit_payout(current_setting('test.claim_id')::uuid, current_setting('test.source_account_id')::uuid, gen_random_uuid());
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%claim is not approved%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;

-- ===== Member dues =====
select set_config('app.user_id', '44444444-4444-4444-4444-444444444444', false);
select status as dues_pending from public.create_member_dues_payment(current_setting('test.member_id')::uuid, 'Annual dues', 5000, 'USD', 'pi_dues_1');
select status as dues_paid from public.settle_member_dues('pi_dues_1');
select count(*) as second_settle_rows from public.settle_member_dues('pi_dues_1');

select set_config('app.user_id', '55555555-5555-5555-5555-555555555555', false);
do $$ begin
  perform * from public.create_member_dues_payment(current_setting('test.member_id')::uuid, 'Annual dues', 5000, 'USD', 'pi_eve');
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%not authorized to pay dues%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;

-- Dues destination is hidden until the organization's Stripe account is active
select set_config('app.user_id', '44444444-4444-4444-4444-444444444444', false);
select count(*) as destination_before_active from public.member_dues_destination(current_setting('test.member_id')::uuid);
select status as org_account_active from public.update_payment_account_status('stripe_connect', 'acct_test_org_members', 'active');
select provider_account_id as destination_after_active from public.member_dues_destination(current_setting('test.member_id')::uuid);

select set_config('app.user_id', '55555555-5555-5555-5555-555555555555', false);
do $$ begin
  perform * from public.member_dues_destination(current_setting('test.member_id')::uuid);
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%not authorized to pay dues%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;

-- A retried checkout with the same PaymentIntent records one dues payment
select set_config('app.user_id', '44444444-4444-4444-4444-444444444444', false);
select count(distinct id) as dues_rows_for_one_intent from (
  select id from public.create_member_dues_payment(current_setting('test.member_id')::uuid, 'Annual dues', 5000, 'USD', 'pi_dues_retry')
  union all
  select id from public.create_member_dues_payment(current_setting('test.member_id')::uuid, 'Annual dues', 5000, 'USD', 'pi_dues_retry')
) retried;

select 'MEMBER INTEGRATION TESTS PASSED' as final_result;
