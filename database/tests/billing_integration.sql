-- Integration tests for migration 0018: subscription billing. Run as `benefitly_app` after every
-- migration, bootstrap.sql and integration.sql (Alice and Eve exist from those fixtures).
-- Expected failures assert their specific messages. Prints "BILLING INTEGRATION TESTS PASSED".

\set ON_ERROR_STOP on
\pset pager off

select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
select id as billing_org_id from public.create_organization('Billing Test Association', 'billing-test-assoc') \gset
select set_config('test.billing_org', :'billing_org_id', false);

-- New organizations start on the free plan with no subscription
select plan_tier as default_plan, subscription_status as default_status from public.organization_billing_context(current_setting('test.billing_org')::uuid);

-- Organization managers cannot move to a paid tier themselves
do $$ begin
  perform * from public.set_organization_plan(current_setting('test.billing_org')::uuid, 'starter');
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%paid plans are purchased through billing%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;

-- Staying on free through the self-serve path still works
select plan_tier as self_serve_free from public.set_organization_plan(current_setting('test.billing_org')::uuid, 'free');

-- Billing context is restricted to organization managers
select set_config('app.user_id', '55555555-5555-5555-5555-555555555555', false);
do $$ begin
  perform * from public.organization_billing_context(current_setting('test.billing_org')::uuid);
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%not authorized to manage billing%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;
do $$ begin
  perform public.save_organization_stripe_customer(current_setting('test.billing_org')::uuid, 'cus_intruder');
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%not authorized to manage billing%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;

-- Customer id is saved once; a second save does not replace it
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
select public.save_organization_stripe_customer(current_setting('test.billing_org')::uuid, 'cus_test_1') as first_customer;
select public.save_organization_stripe_customer(current_setting('test.billing_org')::uuid, 'cus_other') as second_customer_kept_first;

-- The webhook path (runs as the app role) applies a subscription
select plan_tier as plan_after_checkout, subscription_status as status_after_checkout, stripe_subscription_id as sub_after_checkout
from public.apply_organization_subscription(current_setting('test.billing_org')::uuid, 'growth', 'active', 'sub_test_1');

-- While subscribed, self-serve plan changes are refused, even back to free
do $$ begin
  perform * from public.set_organization_plan(current_setting('test.billing_org')::uuid, 'free');
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%cancel your subscription in billing%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;

-- Cancellation returns the organization to free
select plan_tier as plan_after_cancel, subscription_status as status_after_cancel
from public.apply_organization_subscription(current_setting('test.billing_org')::uuid, 'free', 'canceled', null);

-- Unknown organizations are refused by the webhook path
do $$ begin
  perform * from public.apply_organization_subscription('00000000-0000-0000-0000-000000000000'::uuid, 'free', 'canceled', null);
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%organization not found%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;

select 'BILLING INTEGRATION TESTS PASSED' as final_result;
