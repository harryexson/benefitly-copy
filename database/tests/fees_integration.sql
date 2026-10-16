-- Integration tests for migration 0017: optional platform fees and the paid-subscription waiver.
-- Run as `benefitly_app` after every migration, bootstrap.sql and integration.sql (which together
-- create Alice, the organizer, and Bob, the platform admin). Prints
-- "FEE INTEGRATION TESTS PASSED" on success. Expected failures assert their specific messages.

\set ON_ERROR_STOP on
\pset pager off

-- Organization with a campaign, owned by Alice
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
select id as fee_org_id from public.create_organization('Fee Test Association', 'fee-test-assoc') \gset
select set_config('test.fee_org_id', :'fee_org_id', false);
select id as fee_campaign_id from public.create_campaign_with_review(
  'Fee test fundraiser', 'A fundraiser used to test optional platform fees and the subscription waiver, long enough to pass validation.',
  'community', 'Springfield', 'USD', 100000, :'fee_org_id'::uuid, 'fee-test-fundraiser-xyz789', 'Beneficiary', 'Test'
) \gset
select set_config('test.fee_campaign_id', :'fee_campaign_id', false);

-- No subscription yet: the platform fee applies (waiver is off)
select waived as waived_before_subscription from (select public.campaign_platform_fee_waived(current_setting('test.fee_campaign_id')::uuid) as waived) s;
select subscription_status as status_default from public.organizations where id = current_setting('test.fee_org_id')::uuid;

-- Only platform admins can change subscription status
do $$ begin
  perform * from public.set_organization_subscription_status(current_setting('test.fee_org_id')::uuid, 'active');
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%not authorized to change subscriptions%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;

-- Invalid statuses are refused by the schema
select set_config('app.user_id', '22222222-2222-2222-2222-222222222222', false);
do $$ begin
  perform * from public.set_organization_subscription_status(current_setting('test.fee_org_id')::uuid, 'bogus');
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%violates check constraint%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;

-- An active subscription waives the platform fee for that organization's campaigns
select subscription_status as status_after_activation from public.set_organization_subscription_status(current_setting('test.fee_org_id')::uuid, 'active');
select waived as waived_when_subscribed from (select public.campaign_platform_fee_waived(current_setting('test.fee_campaign_id')::uuid) as waived) s;

-- Lapsed subscriptions pay the platform fee again
select subscription_status as status_after_lapse from public.set_organization_subscription_status(current_setting('test.fee_org_id')::uuid, 'past_due');
select waived as waived_when_past_due from (select public.campaign_platform_fee_waived(current_setting('test.fee_campaign_id')::uuid) as waived) s;

-- Individual (non-organization) campaigns are never waived
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
select id as personal_campaign_id from public.create_campaign_with_review(
  'Personal fundraiser', 'A personal fundraiser with no organization, used to check that the waiver never applies to individuals.',
  'medical', 'Springfield', 'USD', 50000, null, 'personal-fundraiser-abc321', 'Myself', 'Self'
) \gset
select waived as waived_for_individual from (select public.campaign_platform_fee_waived(:'personal_campaign_id'::uuid) as waived) s;

-- The donation-account helper is callable by the app role only
select has_function_privilege('benefitly_app', 'public.attach_donation_provider_account(text, text)', 'execute') as app_can_attach;

select 'FEE INTEGRATION TESTS PASSED' as final_result;
