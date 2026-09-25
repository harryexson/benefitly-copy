# Production readiness

Last audited: 2026-09-25

This repository is **not production-ready**, but this pass is the first to actually verify the
database layer against a real PostgreSQL 16 database rather than typechecking and inspection
alone -- see "Verified this pass" below. It found and fixed a critical row-level-security bypass
that would have made every RLS policy in this schema decorative in a real deployment.

| Area | Status | Evidence / required completion work |
| --- | --- | --- |
| Architecture | In progress | Workspace, Next.js, Expo, domain/validation/payments packages and Neon migrations exist. Legacy Vite application is still present. |
| Web | In progress | Real Neon-backed discovery, campaign detail, donate, organizer-dashboard, campaign-media/updates management, organization-workspace and admin-moderation (including payout approval) pages all call the real API. `next build` succeeds cleanly with no known blockers. |
| Expo | In progress | Discover, campaign detail, donate, create-fundraiser, manage (photo/video upload, updates), activity (organizer dashboard + payouts), and profile (auth + notifications) screens all call the real shared backend. Share (native Share sheet) and QR (hosted QR image API, not on-device generation) are wired. Push notifications registered via `expo-notifications` + Expo's push service. `tsc --noEmit` is clean. **Not verified to bundle**: `npx expo export` fails in this environment on a native-codegen parse error inside `react-native-screens`, most likely a further version mismatch introduced by this environment's forward-dated npm registry (see "Known gaps"). Still missing: EAS build profiles, deep-link/universal-link testing on a real device. |
| Authentication | Blocked on real infra, verified correct | Runs against a real Postgres database as part of this pass, using better-auth's actual sign-up flow (not just typechecked): confirmed a real user gets a UUID `id` (`advanced.database.generateId`) and a mirrored `public.profiles` row (`databaseHooks.user.create.after`) -- both are load-bearing fixes without which every domain-table foreign key referencing a user would fail the moment someone signs up. Still needs a real Neon database, production `BETTER_AUTH_SECRET`/origins, and an email sender. |
| Database / RLS | **Verified against real Postgres**, one critical fix | All 9 migrations apply cleanly on PostgreSQL 16. A full transactional integration test (campaign creation → review → admin approval → RLS-gated visibility → donation → settlement → idempotent duplicate → refund → payout request/approve/execute → reports → media → updates → notifications/push tokens → the full association module → two negative-authorization checks) passes end to end running as a **non-owner application role**, which is the only way RLS is actually enforced (see the critical fix below). Still missing: a migration runner, a CI job that runs this integration test automatically. |
| Fundraising | In progress, core loop verified | Sign up → start a fundraiser → manual review → admin approval → public campaign page → guest donation checkout (with optional platform contribution) → settlement → organizer dashboard → payout request → admin approval and execution → refund, verified end to end against real Postgres. Photo/video upload and campaign updates authoring exist (web + mobile). Still missing: real search ranking (current search is a plain `ilike`) and donation receipt emails. |
| Associations | Built this pass, verified against real Postgres | Organization creation, members, dues/contributions, benefit programs, benefit-claim submission and approval, events and registration, and announcements all exist as a web workspace (`/org/[slug]`) backed by permission-checked security-definer functions, and were exercised end to end in the integration test above, including a negative-authorization check (a non-member is rejected). Not yet built: a mobile UI for this module (web-only for now), invitations by email, recurring dues billing, and event check-in. |
| Payments / payouts | Blocked on real credentials, code verified | `@benefitly/payments` implements `PaymentProviderAdapter` for both **Stripe Connect** and **Adyen for Platforms**; neither is reachable without real credentials (`createPaymentProviderRouterFromEnv`). The full payout lifecycle (request → admin approval → provider call → status update) and the Stripe `account.updated` webhook that activates a payment account (a real gap found and fixed this pass -- see below) were verified against real Postgres. The donate screens stop before entering card details (no Stripe Elements / Adyen Drop-in mounted yet). Still blocked on real Stripe/Adyen accounts, webhook secrets, sandbox test runs, and the compliance/counsel review in `docs/architecture/PAYMENT_PROVIDER_DECISION.md`. |
| Notifications | Built this pass, verified against real Postgres | `notifications` table writes (donation received, campaign approved/rejected, payout status) and Expo push delivery (via a dedicated security-definer function, `get_push_tokens_for_notification` -- see below) were exercised in the integration test. Blocked on: real Apple/Google push credentials for a production EAS build (Expo's push service itself needs no separate credentials for development), and an email/SMS channel (not built). |
| Admin / trust | In progress | Platform-admin role table, manual campaign-review queue, campaign reporting, moderation-action recording, fraud-signal schema, and now payout approval, all have a web UI (`/admin/moderation`) and were exercised in the integration test, including a negative-authorization check (a non-admin is rejected). Missing: risk scoring, dispute management, support/escalation tooling, and a way to grant the first `platform_admins` row without direct DB access. |
| Security | In progress | **Critical fix this pass**: see "Row-level security was not actually enforced" below. Webhook signature verification is implemented and code-reviewed but unverified against real provider endpoints. Still needs rate-limit backing storage verified against a real DB, CSRF/origin deployment configuration, file handling/malware-scanning policy for uploads, a secrets manager, and a threat-model review. |
| Tests | Not complete | No automated test suite exists yet (unit/E2E frameworks). This pass's verification was a hand-written SQL integration script run manually against a real database -- real coverage of the write paths, but not repeatable in CI yet, and it does not cover the Next.js route handlers or either frontend. `tsc --noEmit` passes clean across every workspace; `next build` succeeds; every web route was smoke-tested against a running server. |

## Critical fix this pass: row-level security was not actually enforced

**Row level security in Postgres does not apply to the table owner** (or ever to a superuser)
unless a table is put under `FORCE ROW LEVEL SECURITY`. Every migration through 0008 only ran
`enable row level security`. Verified directly: connected as a real, non-superuser role that
*owns* these tables (exactly how a single-role Neon database is normally connected to, and
exactly how these migrations are applied), with no `app.user_id` bound, a raw
`insert into campaigns (..., status) values (..., 'draft')` **succeeded**. Every "security-definer
function only" write-path protection documented in earlier passes was real *as documented
behavior*, but not enforced against a direct query, a bug, or an injection -- if the application's
own database role is the table owner, none of it mattered.

`FORCE ROW LEVEL SECURITY` looked like the fix and is not: this schema's entire write path is
`SECURITY DEFINER` functions owned by that same owner role, specifically so they can bypass RLS
after checking authorization themselves in PL/pgSQL. Forcing RLS applies to the owner
unconditionally, including inside functions that owner owns -- verified that this breaks
`create_campaign_with_review` and every other write function outright, even for an authorized
caller.

**The fix, in `database/migrations/0009_force_row_level_security.sql`, is a second, non-owner
role.** RLS applies to a non-owner automatically with plain `ENABLE ROW LEVEL SECURITY`, while the
`SECURITY DEFINER` functions -- still owned by the table-owning role -- keep bypassing RLS exactly
as designed, regardless of which role calls them. **This is a required deployment step, not
optional**: see `database/README.md` for the full procedure (create `benefitly_app`, grant it the
exact privileges it needs, point the application's `DATABASE_URL` -- never the migration role's --
at it). Re-verified end to end against real Postgres after the fix, connected as the new
`benefitly_app` role: the same raw insert is now rejected, and the full integration test (every
write path in the app) still passes.

Three further, smaller bugs surfaced only by actually executing every function against a real
database (not visible from reading the SQL, and not caught by any linter):

- **`is_org_member`, `is_platform_admin`, `has_permission`** (the RLS-policy helper functions)
  need to be `SECURITY DEFINER` themselves. Called from an RLS policy evaluated as an arbitrary
  querying role, a plain (invoker-rights) helper needs that role to already have a direct grant
  on `organization_members`/`platform_admins`, which `benefitly_app` intentionally does not have
  for `platform_admins`. Fixed; verified the admin-approval flow works as the restricted role.
- **Ambiguous column/parameter names in two `ON CONFLICT` clauses** (`create_pending_donation`,
  `request_payout`): a function parameter named identically to the table's own conflict-target
  column (`idempotency_key`) is genuinely ambiguous inside a PL/pgSQL function body and errors
  at runtime, not at function-creation time. Fixed by renaming the parameters.
- **A `CASE` expression assigned to an enum column without a cast** (`record_moderation_action`
  updating `campaign_reviews.status`): unlike a bare string literal, a `CASE` expression's result
  already has a concrete type before Postgres tries to assign it to an enum column, and that
  assignment is not implicit. Fixed with an explicit cast.

## Critical fix this pass: two real gaps that would have silently broken the app

- **`public.profiles` was never populated.** Every domain table's `owner_id`/`donor_id`/etc.
  references `public.profiles(id)`, but nothing created a row there when someone signed up --
  better-auth manages its own separate `user` table. The first real campaign/organization/
  donation created by any real user would have failed its foreign-key constraint. Fixed with a
  `databaseHooks.user.create.after`/`update.after` mirror in `apps/web/lib/auth.ts`.
- **better-auth's default user IDs are not UUIDs.** better-auth generates a 32-character
  alphanumeric string by default; every domain-table foreign key column is `uuid`. The first
  query binding `session.user.id` into one would have failed with "invalid input syntax for type
  uuid". Fixed with `advanced.database.generateId: () => crypto.randomUUID()`.
- **Payment accounts had no way to ever become `active`.** `upsert_payment_account` creates a
  row at `status = 'pending'`; nothing updated it after the provider actually finished
  onboarding, so the payout button (gated on `status = 'active'`) would never have appeared for
  any real organizer. Fixed by adding `update_payment_account_status` and wiring Stripe's
  `account.updated` webhook event to call it. (Adyen's equivalent account-status webhook is not
  wired yet -- its event model differs and needs its own webhook subscription design.)

Both were caught only because this pass ran better-auth's actual sign-up flow and the full
donation/payout lifecycle against a real database, not by reading the code.

## Build fixed in an earlier pass (web)

`apps/web`'s `next build` did not succeed before that session's changes (verified against a clean
checkout of `main`). Five separate, unrelated defects were compounding; `next build` now completes
cleanly, producing a full static/dynamic route manifest including `/_not-found`: workspace
package `.js`-specifier resolution, a PostCSS config collision with the legacy Vite app,
build-time throws on missing secrets, a better-auth/Neon driver incompatibility (a `Pool` instead
of the `neon()` HTTP tag function), and duplicate React instances from an unpinned `react`
version. Every web API route was smoke-tested against a locally running production build; routes
without their own error handling return a clean `503 SERVICE_UNAVAILABLE` via `withRouteErrorHandling`
instead of Next's bare empty 500.

## Known gaps discovered and only partially fixed

- **Missing `expo-router` dependency (`query-string`).** Its compiled entry `require()`s
  `query-string`, absent from its own `package.json`. Fixed by adding it directly.
- **Floating native dependency versions.** `react-native-screens`/`react-native-safe-area-context`
  are pulled in transitively, unpinned, and resolved to versions ahead of what Expo SDK 53
  shipped with in this environment's forward-dated npm registry. Pinned to their documented
  SDK 53 versions, which is the correct fix in principle (what `expo install` automates), but
  could not be verified against Expo's real compatibility API (network access to it was blocked
  here).
- **`npx expo export` still fails**, even after the above, with a TypeScript-codegen parse error
  inside `react-native-screens`'s Fabric native-component specs. Likely a further mismatch
  between the resolved `babel-preset-expo` (`13.2.5`, transitively via an unpinned `expo`) and
  what SDK 53 expects (`~12.x`). **The Expo app's TypeScript is verified correct and its API
  integration is complete and was exercised against a real backend, but the app has not been
  confirmed to actually bundle or run on a device/simulator.** This is the single highest-priority
  remaining item before any mobile work is trusted.

## Required external inputs

1. Neon pooled and direct connection URLs, and a **second, non-owner `benefitly_app` role** for the running application (see `database/README.md` -- this is now a required step, not optional).
2. `BETTER_AUTH_SECRET`, production web/mobile origins, email provider and sender domain.
3. Stripe secret key + webhook signing secret (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, optional `STRIPE_CONNECT_ACCOUNT_TYPE`); Adyen API key, HMAC key, merchant account and balance platform (`ADYEN_API_KEY`, `ADYEN_HMAC_KEY`, `ADYEN_MERCHANT_ACCOUNT`, `ADYEN_BALANCE_PLATFORM`, `ADYEN_ENVIRONMENT`) -- see `packages/payments/src/config.ts`. Connect mode/region policy, permitted payout countries and counsel/compliance sign-off per `docs/architecture/PAYMENT_PROVIDER_DECISION.md`.
4. Storage provider credentials (`BLOB_READ_WRITE_TOKEN` for the built Vercel Blob adapter, or a different provider), plus a malware-scanning and retention policy before real campaign media is accepted.
5. EAS project/account ownership, Apple Developer and Google Play Console accounts, and a working `expo export`/EAS build in a real (non-sandboxed) environment.
6. Legal-approved privacy policy, terms, financial disclosures, charity/fundraising compliance rules, refund/dispute policy and support escalation process.
7. At least one `platform_admins` row (inserted manually against the production database) before any campaign can be approved, since Phase 1 requires manual review and there is no bootstrap admin UI yet.

## Base44 exit status

**BASE44 REFERENCES: not verified as 0.** The legacy function/source directories are retained as migration references. They must not be deleted until their secure replacements are implemented and tested. A final repository-wide `rg -uuu -n -i 'base44|vite_base44|base44_' .` check is required after migration.

## Still not built (explicit product requirements)

Deep-link/universal-link testing on a real device, donation receipt emails, a mobile UI for the
association-management module (web-only today), event check-in, recurring dues billing, and EAS
build profiles.

## Release decision

Do not deploy, enable donations/payouts, submit to app stores, or claim production readiness.
The next implementation sequence is: apply the two-role database fix in a real Neon deployment
and re-run the integration test there; verify the Expo app actually bundles and runs on a real
device/simulator (top priority -- see "Known gaps"); obtain real Stripe/Adyen sandbox
credentials, mount Stripe Elements/Adyen Drop-in on the donate screens, and run the guardrail
checklist in `docs/architecture/PAYMENT_PROVIDER_DECISION.md`; wire Adyen's account-status
webhook (Stripe's is done); build a mobile UI for the association module; set up a real
storage provider for uploads; turn this pass's manual SQL integration test into an automated
CI suite alongside E2E coverage of both frontends; then remove the legacy provider code and
publish a verified completion report.
