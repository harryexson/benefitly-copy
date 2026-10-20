-- Fixtures for members_integration.sql. Run once, as the owner/superuser role, after bootstrap.sql
-- and before members_integration.sql. Creates the three extra people the suite signs in as.
-- Alice (organizer), Bob (platform admin) and Carol come from bootstrap.sql.
insert into public.profiles (id, email, name) values
  ('44444444-4444-4444-4444-444444444444', 'dana@example.com', 'Dana Member'),
  ('55555555-5555-5555-5555-555555555555', 'eve@example.com', 'Eve Outsider'),
  ('66666666-6666-6666-6666-666666666666', 'grace@example.com', 'Grace Treasurer');
