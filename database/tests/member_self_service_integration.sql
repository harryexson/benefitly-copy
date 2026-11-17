-- Integration tests for migration 0024: member self-service and organization dues. Run as
-- `benefitly_app` after members_integration.sql (Dana, Eve and the members-test organization).
-- Prints "MEMBER SELF-SERVICE INTEGRATION TESTS PASSED" on success.
\set ON_ERROR_STOP on
\pset pager off

select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
select set_config('test.org_id', (select id::text from public.organizations where slug = 'members-test-assoc'), false);

select set_config('app.user_id', '44444444-4444-4444-4444-444444444444', false);
select count(*) as dana_memberships from public.my_memberships();
select count(*) as dana_claims from public.my_benefit_claims();

select set_config('app.user_id', '55555555-5555-5555-5555-555555555555', false);
select count(*) as eve_memberships from public.my_memberships();
select count(*) as eve_claims from public.my_benefit_claims();

select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
select count(*) as alice_dues_rows from public.organization_dues_overview(current_setting('test.org_id')::uuid);

select set_config('app.user_id', '55555555-5555-5555-5555-555555555555', false);
do $$ begin
  perform * from public.organization_dues_overview(current_setting('test.org_id')::uuid);
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%not authorized to view dues%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;

select 'MEMBER SELF-SERVICE INTEGRATION TESTS PASSED' as final_result;
