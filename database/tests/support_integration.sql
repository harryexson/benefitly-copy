-- Integration tests for migration 0023: support tickets. Run as `benefitly_app` after the members
-- fixtures (Dana, Eve, Grace) and the core suite (Alice and Bob). Prints
-- "SUPPORT INTEGRATION TESTS PASSED" on success. Expected failures assert their specific messages.
\set ON_ERROR_STOP on
\pset pager off

select set_config('app.user_id', '44444444-4444-4444-4444-444444444444', false);
select id as dana_ticket from public.create_support_ticket('Cannot pay dues', 'The pay button does nothing on my phone.', null) \gset
select set_config('test.dana_ticket', :'dana_ticket', false);
select count(*) as dana_sees_own from public.support_tickets where id = :'dana_ticket';

select set_config('app.user_id', '55555555-5555-5555-5555-555555555555', false);
select count(*) as eve_sees_danas from public.support_tickets where id = :'dana_ticket';

select set_config('app.user_id', '', false);
do $$ begin
  perform * from public.create_support_ticket('Anonymous', 'This should not be accepted at all.', null);
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%sign in required%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;

-- An organization ticket is visible to that organization's members only
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
select id as org_for_ticket from public.create_organization('Support Test Association', 'support-test-assoc') \gset
select id as org_ticket from public.create_support_ticket('Need help with roles', 'Please walk me through creating a role.', :'org_for_ticket'::uuid) \gset
select set_config('test.org_ticket', :'org_ticket', false);
select count(*) as alice_sees_org_ticket from public.support_tickets where id = :'org_ticket';
select set_config('app.user_id', '55555555-5555-5555-5555-555555555555', false);
select count(*) as eve_sees_org_ticket from public.support_tickets where id = :'org_ticket';
do $$ begin
  perform * from public.create_support_ticket('Sneaky', 'Filed on an organization I do not belong to.', current_setting('test.org_ticket')::uuid);
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%not a member of this organization%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;

-- Admin queue: Bob sees everything; Eve cannot use it; updates record a resolution
select set_config('app.user_id', '22222222-2222-2222-2222-222222222222', false);
select count(*) as admin_queue_sees_dana from public.admin_list_support_tickets(500) where id = :'dana_ticket';
select status as after_admin_update from public.admin_update_support_ticket(:'dana_ticket', 'resolved', 'Fixed a layout issue on mobile.');
select resolution_note as note_saved from public.support_tickets where id = :'dana_ticket';

select set_config('app.user_id', '55555555-5555-5555-5555-555555555555', false);
do $$ begin
  perform * from public.admin_list_support_tickets(10);
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%not authorized to view the support queue%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;
do $$ begin
  perform * from public.admin_update_support_ticket(current_setting('test.dana_ticket')::uuid, 'closed', 'nope');
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%not authorized to manage support tickets%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;

select set_config('app.user_id', '22222222-2222-2222-2222-222222222222', false);
do $$ begin
  perform * from public.admin_update_support_ticket(current_setting('test.dana_ticket')::uuid, 'bogus', null);
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%support_tickets_status_values%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;

select 'SUPPORT INTEGRATION TESTS PASSED' as final_result;
