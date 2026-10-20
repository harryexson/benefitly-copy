# Benefitly — Audit Baseline

> Captured during full-system audit session. Records the state of all verification checks.

## 1. TypeScript Compilation

```
npx tsc --noEmit -p apps/web/tsconfig.json
Result: PASS (zero errors)
```

## 2. Production Build

```
npx next build (apps/web)
Result: PASS (exit code 0)
- All static pages prerendered
- All dynamic routes compiled
- No webpack errors
- Output: standalone mode
```

## 3. Database Migrations

```
14 sequential migrations (0001–0014)
Result: All apply cleanly from an empty database
```

Migration inventory:
| # | File | Scope |
|---|------|-------|
| 0001 | initial_schema.sql | profiles, organizations, campaigns, donations, ledger |
| 0002 | association_module.sql | members, contributions, benefits, events, announcements |
| 0003 | trust_and_moderation.sql | reviews, reports, moderation, fraud, webhooks, platform contributions |
| 0004 | fix_rls_policies.sql | RLS policy corrections |
| 0005 | payment_accounts.sql | Stripe Connect accounts, payouts |
| 0006 | campaign_media.sql | Photo/video uploads |
| 0007 | notifications.sql | In-app + push notifications |
| 0008 | fix_campaign_slug.sql | Slug generation fix |
| 0009 | app_role_grants.sql | benefitly_app role grants |
| 0010 | subscription_plans.sql | Organization plan tiers |
| 0011 | donor_features.sql | Saved campaigns, giving plans, charity directory |
| 0012 | donor_crm.sql | Donor CRM permissions |
| 0013 | campaign_events.sql | Campaign-level events (non-ticketed) |
| 0014 | ticketed_events.sql | Ticket types, tickets, capacity enforcement, check-in |

## 4. Database Integration Tests

SQL-based integration test suite (`database/tests/integration.sql`) covers:
- Campaign lifecycle (create → review → publish → donate → settle)
- Donation settlement and idempotent deduplication
- Refund flow via `refund_donation_ledger`
- Payout request → approval → execution
- Campaign reports and moderation actions
- Media uploads
- Notification system
- Association module (members, contributions, benefits, events)
- Subscription plan limits
- Donor scoping and giving plans
- Charity directory
- Donor CRM permissions
- Ticketed events with capacity enforcement and check-in

All tests pass when run against a live PostgreSQL instance.

## 5. Security Audit

### Authentication
- better-auth with email+password, rate-limited auth endpoints
- Cookie-based sessions with `requireSession()` helper
- Expo plugin for mobile auth

### Authorization
- Two-layer model: API-layer checks + SQL-level RLS/SECURITY DEFINER
- `withUserContext` binds user identity for RLS enforcement
- Admin routes: `isPlatformAdmin()` at API layer + `is_platform_admin()` in SQL
- Organization routes: SQL-level `is_org_member()` checks

### Input Validation
- Zod schemas via `@benefitly/validation` on all POST/PATCH routes
- No eval, no dynamic code execution
- No hardcoded secrets in source code

### XSS / Injection
- No raw HTML rendering of user input
- All database queries use parameterized queries (tagged template literals)
- No string concatenation in SQL

### Open Redirect
- All redirect paths use `startsWith("/") && !startsWith("//")` guard

### Webhook Security
- Stripe: `stripe.webhooks.constructEvent` signature verification
- Adyen: HMAC signature verification

## 6. Dependency Audit

No known critical vulnerabilities in direct dependencies at time of audit. Key dependencies pinned to specific versions via lockfile.

## 7. Build Configuration

- `reactStrictMode: true`
- `output: "standalone"` (for containerized deployment)
- Transpiles `@benefitly/*` workspace packages
- Webpack extension alias `.js → [.ts, .tsx, .js]`
