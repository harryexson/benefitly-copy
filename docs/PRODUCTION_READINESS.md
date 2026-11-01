# Production readiness: status as of this branch

This replaces the certification language in `FINAL_PRODUCTION_CERTIFICATION_REPORT.md`, which
overstated what had been verified. The platform is **not yet production-ready**. This document
separates what is verified, what is built but unverified, and what is blocked on outside access.

## Verified in this environment

- All 21 migrations apply to an empty PostgreSQL 16 database, in order.
- Six SQL suites pass on that database, run as the restricted `benefitly_app` role so RLS applies:
  core integration, members, fees, billing, plan gating, and growth features. Run with
  `database/tests/*.sql` in the order given in `database/README.md`.
- Better Auth sign-up, sign-in, wrong-password rejection, and profile mirroring work against
  the same database.
- The web app typechecks and builds for production. The shared packages typecheck.

## Built but not verified

- **Stripe, end to end.** Donation and ticket direct charges, the tip as an application fee,
  refunds on the connected account, dues checkout, subscription checkout, the billing portal, and
  the webhook branches have not run against Stripe. No test keys have been available.
- **Email.** Invitations, dues reminders, and scheduled report emails are built but have not been
  sent through Resend.
- **Cron.** `/api/cron/reports` is built and configured in `vercel.json`, but has not run on Vercel.
- **Browser behavior.** Pages that query the database (donate, billing, operations) have not been
  loaded in a browser. The local setup cannot serve Neon's HTTP driver.
- **Mobile.** Only the default tip changed. The mobile donation payment flow is unverified.

## Blocked on outside access

- **Member payout execution.** Paying a member's bank account needs Stripe OutboundPayment access.
  Until that is confirmed, approved payouts stay approved and unexecuted.
- **SSO.** Needs the organization's identity provider details (issuer, client registration,
  protocol) to build and test against.
- **Dedicated infrastructure.** A hosting arrangement, not application code.

## Known gaps in the code

- Webhook downgrades do not check member counts. An organization over its new limit keeps its
  members and simply cannot add more. This is intentional, but it should be stated in the terms.
- Growth, Scale, and Enterprise differ from Starter by member limit and by the features listed in
  the plan copy. Confirm the product intent before selling.
- Dues reminders assume an annual dues cycle (paid within the last 12 months).
- `main` contains a change that trusts every `*.vercel.app` origin for auth. This widens
  cross-site request exposure and should be narrowed to this project's preview domains before
  it reaches production.
- The support tickets table exists with no API and no screen.
- Public endpoints (donations, check-in, reports, ticket purchase) have no application-level rate
  limit.

## Not in place

- No CI workflow runs the SQL suites, typecheck, or build on each change.
- No unit tests cover the TypeScript helpers (CSV, template rendering, fee math).
- No lint configuration.
- No monitoring, alerting, or error reporting service is configured.
- No documented backup and restore procedure has been rehearsed.
- Disaster recovery and incident runbooks exist as drafts in `docs/` but have not been exercised.
