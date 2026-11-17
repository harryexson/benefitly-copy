-- Integration tests for migration 0020: CSV reports, reminders and templates, volunteer management,
-- bulk payouts, advanced roles, scheduled reports, API keys, and the invitation escalation fix.
-- Run as `benefitly_app` after members_fixtures.sql and members_integration.sql (for Dana, Grace,
-- Eve, Carol). Expected failures assert their specific messages.
-- Prints "GROWTH FEATURE INTEGRATION TESTS PASSED" as the last line on success.

\set ON_ERROR_STOP on
\pset pager off

-- Organization on the free plan
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
select id as feat_org from public.create_organization('Features Test Association', 'features-test-assoc') \gset
select set_config('test.feat_org', :'feat_org', false);

do $$ begin
  perform * from public.organization_report(current_setting('test.feat_org')::uuid, 'members');
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%csv reports are not included in your plan%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;

-- Platform admin grants Growth
select set_config('app.user_id', '22222222-2222-2222-2222-222222222222', false);
select plan_tier as granted_growth from public.admin_set_organization_plan(current_setting('test.feat_org')::uuid, 'growth');
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);

-- Member records with contact details: Dana (no paid dues) and Carol
select id as dana_member from public.add_member(current_setting('test.feat_org')::uuid, '44444444-4444-4444-4444-444444444444', 'F-1', 'Standard', '{"email":"dana@example.com","name":"Dana Member"}'::jsonb) \gset
select set_config('test.dana_member', :'dana_member', false);
select id as carol_member from public.add_member(current_setting('test.feat_org')::uuid, '33333333-3333-3333-3333-333333333333', 'F-2', 'Standard', '{"email":"carol@example.com","name":"Carol"}'::jsonb) \gset
select set_config('test.carol_member', :'carol_member', false);

-- ===== CSV reports =====
select count(*) as members_report_rows from public.organization_report(current_setting('test.feat_org')::uuid, 'members');
select count(*) as dues_report_rows from public.organization_report(current_setting('test.feat_org')::uuid, 'dues');
do $$ begin
  perform * from public.organization_report(current_setting('test.feat_org')::uuid, 'bogus');
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%unknown report%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;

-- ===== Advanced roles: escalation is refused at every grant path =====
select invitation_id as grace_invite, token as grace_token from public.invite_to_organization(current_setting('test.feat_org')::uuid, 'grace@example.com', array['members.manage']::text[]) \gset
select set_config('test.grace_token', :'grace_token', false);
select set_config('app.user_id', '66666666-6666-6666-6666-666666666666', false);
select status as grace_joined from public.accept_organization_invitation(current_setting('test.grace_token'));

do $$ begin
  perform * from public.invite_to_organization(current_setting('test.feat_org')::uuid, 'eve@example.com', array['organization.manage']::text[]);
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%cannot grant permissions you do not hold%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;

do $$ begin
  perform * from public.create_organization_role(current_setting('test.feat_org')::uuid, 'Sneaky', array['organization.manage']::text[]);
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%not authorized to manage roles%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;

-- Alice (holds everything) creates a Treasurer role and assigns it to Grace
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
select id as treasurer_role from public.create_organization_role(current_setting('test.feat_org')::uuid, 'Treasurer', array['finance.manage','payouts.approve']::text[]) \gset
select set_config('test.treasurer_role', :'treasurer_role', false);
select permissions as grace_perms_after_assign from public.assign_organization_role(current_setting('test.feat_org')::uuid, '66666666-6666-6666-6666-666666666666', current_setting('test.treasurer_role')::uuid);

-- Grace can now approve payouts for this organization (the role's permission), which she could not before
select public.has_permission(current_setting('test.feat_org')::uuid, 'payouts.approve') as grace_can_approve_now;

-- ===== Volunteer management =====
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
select id as vol_opp from public.create_volunteer_opportunity(current_setting('test.feat_org')::uuid, 'Food drive', 'Sort and pack', now() + interval '7 days', null, 'Hall', 1) \gset
select set_config('test.vol_opp', :'vol_opp', false);
select id as dana_signup from public.volunteer_sign_up(current_setting('test.vol_opp')::uuid, current_setting('test.dana_member')::uuid) \gset
select set_config('test.dana_signup', :'dana_signup', false);

do $$ begin
  perform * from public.volunteer_sign_up(current_setting('test.vol_opp')::uuid, current_setting('test.carol_member')::uuid);
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%this opportunity is full%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;

select set_config('app.user_id', '44444444-4444-4444-4444-444444444444', false);
do $$ begin
  perform * from public.volunteer_sign_up(current_setting('test.vol_opp')::uuid, current_setting('test.dana_member')::uuid);
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%already signed up%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;

-- Dana cancels; a seat opens for Carol
select status as dana_canceled from public.volunteer_cancel(current_setting('test.dana_signup')::uuid);
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
select count(*) as carol_signed_up from (select * from public.volunteer_sign_up(current_setting('test.vol_opp')::uuid, current_setting('test.carol_member')::uuid)) s;
select confirmed_count from public.volunteer_opportunity_counts(current_setting('test.feat_org')::uuid);

-- ===== Email reminders and custom templates =====
select count(*) as reminder_recipients_growth from public.dues_reminder_recipients(current_setting('test.feat_org')::uuid);
select count(*) as dana_is_recipient from public.dues_reminder_recipients(current_setting('test.feat_org')::uuid) r where r.member_id = current_setting('test.dana_member')::uuid;
select subject as template_subject from public.upsert_email_template(current_setting('test.feat_org')::uuid, 'dues_reminder', 'Your dues are due', 'Hello {{name}}, please renew with {{organization}}.');
select count(*) as custom_template_visible_growth from public.organization_email_template(current_setting('test.feat_org')::uuid, 'dues_reminder');

-- ===== Bulk payouts: gate, batch size, one organization =====
do $$ begin
  perform * from public.initiate_benefit_payouts(array[]::uuid[], null);
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%no claims given%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;
do $$ declare ids uuid[] := array(select gen_random_uuid() from generate_series(1,101)); begin
  perform * from public.initiate_benefit_payouts(ids, null);
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%limited to 100 claims%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;

-- ===== Scheduled reports and API keys need Scale =====
do $$ begin
  perform * from public.create_report_schedule(current_setting('test.feat_org')::uuid, 'members', 'board@example.com', 'weekly');
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%automated reports are not included%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;
do $$ begin
  perform * from public.create_api_key(current_setting('test.feat_org')::uuid, 'Website', 'bk_test', encode(sha256(convert_to('bk_test_key_1','UTF8')),'hex'));
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%API access is not included%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;

select set_config('app.user_id', '22222222-2222-2222-2222-222222222222', false);
select plan_tier as granted_scale from public.admin_set_organization_plan(current_setting('test.feat_org')::uuid, 'scale');
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);

select id as schedule_id from public.create_report_schedule(current_setting('test.feat_org')::uuid, 'members', 'board@example.com', 'weekly') \gset
select set_config('test.schedule', :'schedule_id', false);

-- The cron path runs as the app role with no user session
select set_config('app.user_id', '', false);
select count(*) as due_on_scale from public.due_report_schedules() where id = current_setting('test.schedule')::uuid;
select public.mark_report_sent(current_setting('test.schedule')::uuid);
select count(*) as due_right_after_send from public.due_report_schedules() where id = current_setting('test.schedule')::uuid;

-- API key: the plaintext is shown once; only its hash is stored
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', false);
select id as api_key_id from public.create_api_key(current_setting('test.feat_org')::uuid, 'Website', 'bk_test', encode(sha256(convert_to('bk_test_key_1','UTF8')),'hex')) \gset
select set_config('test.api_key_hash', encode(sha256(convert_to('bk_test_key_1','UTF8')),'hex'), false);
select set_config('test.api_key_id', :'api_key_id', false);
select count(*) as members_via_key from (select * from public.api_list_members(current_setting('test.feat_org')::uuid, current_setting('test.api_key_hash'))) s;
do $$ begin
  perform * from public.api_list_members(current_setting('test.feat_org')::uuid, encode(sha256(convert_to('wrong','UTF8')),'hex'));
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%invalid API key%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;
select public.revoke_api_key(current_setting('test.feat_org')::uuid, current_setting('test.api_key_id')::uuid);
do $$ begin
  perform * from public.api_list_members(current_setting('test.feat_org')::uuid, current_setting('test.api_key_hash'));
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%invalid API key%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;

-- Downgrade to Growth: scheduled reports stop, reminders and CSV continue
select set_config('app.user_id', '22222222-2222-2222-2222-222222222222', false);
select plan_tier as back_to_growth from public.admin_set_organization_plan(current_setting('test.feat_org')::uuid, 'growth');
select set_config('app.user_id', '', false);
select count(*) as due_after_downgrade from public.due_report_schedules() where id = current_setting('test.schedule')::uuid;

select 'GROWTH FEATURE INTEGRATION TESTS PASSED' as final_result;
