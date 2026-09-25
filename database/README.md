# Database deployment

Migrations are plain SQL, applied in order, by a single owner-privileged connection (Neon's
default provisioned role for the branch). **Verified against a real PostgreSQL 16 database** as
part of this repository's own test process -- not just typechecked.

## Apply order

```
0001_foundation.sql
0002_association_core.sql
0003_crowdfunding_trust.sql
0004_payout_approval.sql
0005_campaign_media.sql
0006_fix_campaign_write_gaps.sql
0007_notifications.sql
0008_association_module.sql
0009_force_row_level_security.sql
```

No migration runner exists yet; apply each file with `psql -f` (or the Neon SQL editor) in this
order, as the database's default/owner role.

## Two roles, not one

Row level security in Postgres does not apply to the table owner unless a table is put under
`FORCE ROW LEVEL SECURITY` -- and this schema's write path is built on `SECURITY DEFINER`
functions that are *owned by the same role that owns the tables*, specifically so they can bypass
RLS after doing their own authorization check in PL/pgSQL. Forcing RLS on those tables breaks
those functions (verified). The only correct fix is a second, non-owner role:

1. Run every migration above, and better-auth's own schema migration (`npx @better-auth/cli
   migrate`, which creates `user`, `session`, `account`, `verification`), as the owner role.
2. `0009_force_row_level_security.sql` creates a `benefitly_app` role with a placeholder
   password (`CHANGE_ME_SET_A_REAL_PASSWORD`) and grants it exactly the base privileges the
   application needs -- `ALTER ROLE benefitly_app PASSWORD '...'` to set a real one.
3. Grant `benefitly_app` access to better-auth's own tables (not part of this migration set,
   since better-auth generates their DDL itself):
   ```sql
   grant select, insert, update, delete on "user", "session", "account", "verification" to benefitly_app;
   ```
4. Set the *application's* `DATABASE_URL` (`apps/web`'s runtime environment) to a connection
   string authenticating as `benefitly_app`. **Never** use the owner role's connection string
   for the running application -- only for migrations. Using the owner role for the app defeats
   every RLS policy in this schema (verified: a raw, unauthenticated `insert into campaigns
   (..., status) values (..., 'draft')` succeeds against the owner role and is rejected against
   `benefitly_app`).

## better-auth configuration that this schema depends on

`apps/web/lib/auth.ts` sets two options that are load-bearing, not stylistic:

- `advanced.database.generateId: () => crypto.randomUUID()` -- every domain table's
  `owner_id`/`donor_id`/`actor_id`/etc. is `uuid`. better-auth's default id generator produces a
  32-character alphanumeric string, not a UUID; without this override, the first real sign-up
  fails every subsequent query that binds `session.user.id` into a `uuid` column. (The built-in
  `generateId: "uuid"` shorthand does not work here either -- it relies on a `default
  gen_random_uuid()` on better-auth's own `id` columns that its schema generator does not add;
  verified to fail with a NOT NULL violation.)
- `databaseHooks.user.create.after` / `user.update.after` -- mirrors the better-auth `user` row
  into `public.profiles`, which every domain table's foreign keys actually reference. Without
  this, `public.profiles` is never populated at all and every campaign/organization/donation
  creation fails its foreign-key constraint the moment a real (non-seeded) user tries to use it.

Both were verified against a real Postgres database with better-auth's actual sign-up flow, not
just read from its source.

## Verifying a migration set

`database/tests/integration.sql` (with fixtures in `database/tests/bootstrap.sql`) exercises
every write path in this schema end to end, run as `benefitly_app` -- not the owner role, which
would not actually exercise RLS at all. There is no CI wired up for this yet; run it by hand
against a scratch database whenever you change a migration or a security-definer function:

```sh
createdb -O <owner-role> benefitly_check
psql -U <owner-role> -d benefitly_check -f database/migrations/0001_foundation.sql
# ... apply every migration in order ...
psql -U <owner-role> -d benefitly_check -f database/migrations/0009_force_row_level_security.sql
psql -U <owner-role> -d benefitly_check -c "alter role benefitly_app password 'test';"
psql -U <owner-role> -d benefitly_check -f database/tests/bootstrap.sql
psql -U benefitly_app -d benefitly_check -f database/tests/integration.sql
```

A real, non-superuser role that merely *owns* the tables is not a sufficient check on its own --
ownership alone bypasses RLS the same way a superuser does, which is exactly the bug this suite
exists to catch. Always run the integration script as `benefitly_app`, and separately confirm a
raw `insert`/`update` against an app-facing table with no `app.user_id` bound is rejected when
connected as `benefitly_app` (it should not be, when connected as the owner role -- that
asymmetry is the point).
