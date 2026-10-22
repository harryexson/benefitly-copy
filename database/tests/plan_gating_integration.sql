-- Integration tests for migration 0019: plan feature gating and member limits, enforced in the
-- database. Run as `benefitly_app` after members_fixtures.sql (for Eve's profile) and
-- members_integration.sql. Expected failures assert their specific messages.
-- Prints "PLAN GATING INTEGRATION TESTS PASSED" as the last line on success.

\set ON_ERROR_STOP on
\pset pager off

-- Organization on the free plan (new organization, default tier)
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
select id as gate_org_id from public.create_organization('Gating Test Association', 'gating-test-assoc') \gset
select set_config('test.gate_org', :'gate_org_id', false);
select public.organization_has_feature(current_setting('test.gate_org')::uuid, 'benefit_programs') as free_has_benefits;
select public.organization_has_feature(current_setting('test.gate_org')::uuid, 'no_such_feature') as unknown_feature_denied;

do $$ begin
  perform * from public.create_benefit_program(current_setting('test.gate_org')::uuid, 'Relief', 'Help', 'Members', 1000, 0);
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%benefit programs are not included in your plan%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;

-- Alice becomes a member so dues checks have a real member record
select id as gate_member_id from public.add_member(current_setting('test.gate_org')::uuid, '11111111-1111-1111-1111-111111111111', 'G-1', 'Standard', '{}'::jsonb) \gset
select set_config('test.gate_member', :'gate_member_id', false);

do $$ begin
  perform * from public.member_dues_destination(current_setting('test.gate_member')::uuid);
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%member dues checkout is not included in your plan%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;

-- Platform admin grants Starter (comped); features unlock
select set_config('app.user_id', '22222222-2222-2222-2222-222222222222', false);
select plan_tier as granted from public.admin_set_organization_plan(current_setting('test.gate_org')::uuid, 'starter');
select public.organization_has_feature(current_setting('test.gate_org')::uuid, 'benefit_programs') as starter_has_benefits;
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
select id as gate_program_id from public.create_benefit_program(current_setting('test.gate_org')::uuid, 'Relief', 'Help', 'Members', 1000, 0) \gset
select count(*) as dues_destination_rows_on_starter from public.member_dues_destination(current_setting('test.gate_member')::uuid);

-- A canceled subscription drops the organization to free, even though the plan row says starter
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
select plan_tier as canceled_plan, subscription_status as canceled_status from public.apply_organization_subscription(current_setting('test.gate_org')::uuid, 'starter', 'canceled', null);
do $$ begin
  perform * from public.member_dues_destination(current_setting('test.gate_member')::uuid);
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%member dues checkout is not included in your plan%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;

-- Past due keeps paid features while Stripe retries payment
select plan_tier as past_due_plan from public.apply_organization_subscription(current_setting('test.gate_org')::uuid, 'starter', 'past_due', 'sub_gate_1');
select count(*) as past_due_keeps_dues from public.member_dues_destination(current_setting('test.gate_member')::uuid);

-- Member limit: a one-member plan (test_tiny from bootstrap). Alice already fills the one seat.
select set_config('app.user_id', '22222222-2222-2222-2222-222222222222', false);
select plan_tier as tiny_plan from public.admin_set_organization_plan(current_setting('test.gate_org')::uuid, 'test_tiny');
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);

do $$ begin
  perform * from public.add_member(current_setting('test.gate_org')::uuid, '55555555-5555-5555-5555-555555555555', 'G-2', 'Standard', '{}'::jsonb);
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%member limit reached%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;

-- The invitation path enforces the same limit, not just add_member
select invitation_id as eve_invite, token as eve_token from public.invite_to_organization(current_setting('test.gate_org')::uuid, 'eve@example.com') \gset
select set_config('test.eve_token', :'eve_token', false);
select set_config('app.user_id', '55555555-5555-5555-5555-555555555555', false);
do $$ begin
  perform * from public.accept_organization_invitation(current_setting('test.eve_token'));
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%member limit reached%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;

-- A canceled subscription is measured against the free plan's limit, whatever plan row it still names
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
select plan_tier as canceled_tier from public.apply_organization_subscription(current_setting('test.gate_org')::uuid, 'test_tiny', 'canceled', null);
select public.organization_member_limit(current_setting('test.gate_org')::uuid) as canceled_member_limit;

select 'PLAN GATING INTEGRATION TESTS PASSED' as final_result;
