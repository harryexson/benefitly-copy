-- Test fixtures for integration.sql. Run once, as a superuser (or any role that bypasses RLS),
-- before integration.sql -- which connects as the restricted `benefitly_app` role and cannot
-- insert into platform_admins itself (correctly: nothing in the application ever should either).
insert into public.profiles (id, email, name) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com', 'Alice Organizer'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com', 'Bob Admin'),
  ('33333333-3333-3333-3333-333333333333', 'carol@example.com', 'Carol Donor');
insert into public.platform_admins (profile_id) values ('22222222-2222-2222-2222-222222222222');
