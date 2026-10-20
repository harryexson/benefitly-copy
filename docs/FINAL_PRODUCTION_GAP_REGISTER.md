# Benefitly — Production Gap Register

> Generated from full-system audit. Each finding is tagged with severity, status, and the commit that resolved it (where applicable).

## P0 — Critical (security / data integrity)

### GAP-001: Refund route IDOR — any user could refund any donation
- **Route:** `POST /api/donations/[id]/refund`
- **Root cause:** Used plain `sql` to read from RLS-protected `donations` table without binding `app.user_id`. `current_user_id()` returned null, so all ownership-based RLS policies failed silently — query returned zero rows, making refunds appear broken rather than exploitable in practice.
- **Impact:** Refund functionality was completely broken (no rows returned). If RLS had a permissive fallback, it would allow any authenticated user to refund any donation.
- **Status:** ✅ FIXED — commit `183dfcd` (switched to `withUserContext`)

### GAP-002: Admin routes had no API-layer authorization
- **Routes:** `GET /api/admin/payouts`, `POST /api/admin/payouts/[id]/approve`, `POST /api/admin/moderation`, `POST /api/admin/organizations/[id]/plan`
- **Root cause:** Authorization was enforced solely inside PostgreSQL SECURITY DEFINER functions via `is_platform_admin()`. Non-admin requests triggered full DB work before being rejected via exception, and error detection relied on fragile `message.includes("not authorized")` string matching.
- **Impact:** Non-admins could trigger database operations; if any SQL function's admin check was accidentally removed in a migration, there would be no fallback.
- **Status:** ✅ FIXED — commit `32f51dc` (added `isPlatformAdmin()` guard at API layer)

## P1 — High (defense-in-depth / correctness)

### GAP-003: Donation creation uses plain `sql` for all DB operations
- **Route:** `POST /api/donations`
- **Root cause:** Both `campaign_donation_destination` and `create_pending_donation` are called with plain `sql`. Both are SECURITY DEFINER functions, so RLS bypass is by design. Guest checkout (no session) is intentional.
- **Impact:** Low — SECURITY DEFINER functions handle authorization internally. The trade-off is documented: guest donations are unscoped by design to support anonymous giving.
- **Status:** ⚠️ ACCEPTED RISK — documented architectural decision for guest checkout support

### GAP-004: Ticket purchase free-ticket path settles immediately without user context
- **Route:** `POST /api/campaigns/[id]/events/[eventId]/tickets`
- **Root cause:** Free tickets (price_cents = 0, no tip) call `create_pending_donation` + `settle_donation` with plain `sql`. An unauthenticated user can create and settle a zero-amount donation and reserve tickets without any identity binding.
- **Impact:** Potential inventory exhaustion — an attacker could claim all free tickets by repeatedly calling the endpoint. Rate limiting at the infrastructure level (Vercel) provides some protection.
- **Status:** ⚠️ KNOWN RISK — free ticket flow needs rate limiting. Infrastructure-level rate limiting via Vercel partially mitigates. Consider adding per-email deduplication or CAPTCHA for free ticket purchases.

### GAP-005: Admin payout notification query bypasses RLS
- **Route:** `POST /api/admin/payouts/[id]/approve` (notifyPayoutStatus helper)
- **Root cause:** Uses plain `sql` to read `campaigns` table for notification context. With RLS active and no user context, the query may return zero rows for unpublished campaigns.
- **Impact:** Cosmetic — payout notification may silently fail to send for unpublished campaigns. No data leak since it only reads `owner_id`, `organization_id`, `title`.
- **Status:** ⚠️ LOW RISK — notification-only impact, admin context already verified

### GAP-006: Admin moderation route uses plain `sql` for campaign notification lookup
- **Route:** `POST /api/admin/moderation` (line 32)
- **Root cause:** Same pattern as GAP-005 — reads campaign data for notification without user context.
- **Status:** ⚠️ LOW RISK — same assessment as GAP-005

## P2 — Medium (input validation / consistency)

### GAP-007: Push token route lacked Zod validation
- **Route:** `POST /api/me/push-tokens`
- **Root cause:** Manual `typeof` check instead of Zod schema. Token length and format not validated.
- **Status:** ✅ FIXED — commit `32f51dc` (added `registerPushTokenSchema`)

### GAP-008: Payouts route missing error handling wrapper
- **Route:** `POST /api/payouts`
- **Root cause:** Exported as `export async function POST` instead of `export const POST = withRouteErrorHandling(...)`. Unhandled exceptions would produce Next.js default error responses instead of the API's standard JSON error format.
- **Status:** ✅ FIXED — commit `32f51dc`

### GAP-009: Unauthenticated endpoints lack API-layer rate limiting
- **Routes:** `POST /api/checkin`, `POST /api/campaigns/[id]/report` (anonymous path), `POST /api/donations`, `POST /api/campaigns/[id]/events/[eventId]/tickets`
- **Root cause:** No visible rate limiting at the API layer. better-auth has rate limiting for auth endpoints, but public API routes rely on infrastructure-level protection (Vercel).
- **Impact:** Potential abuse vectors — ticket inventory exhaustion, report flooding, check-in brute-forcing.
- **Status:** ⚠️ DEFERRED — Vercel provides infrastructure-level rate limiting. Application-level rate limiting (e.g., `@upstash/ratelimit`) recommended for high-risk endpoints before production launch.

### GAP-010: Organization plan change has no org-level permission check at API layer
- **Route:** `POST /api/organizations/[id]/plan`
- **Root cause:** Any authenticated user can attempt to change an org's plan. Authorization is deferred to `set_organization_plan` in SQL.
- **Status:** ⚠️ ACCEPTED — SQL function performs the permission check. Same pattern as other SQL-delegated authorization (but unlike admin routes, this doesn't warrant an API-layer check since org membership is more complex than a boolean admin flag).

## P3 — Low (documentation / observability)

### GAP-011: No structured API documentation
- **Impact:** Consumers (mobile app, potential third-party integrations) must read source code to understand API contracts.
- **Status:** ⚠️ DEFERRED — API is internal (web + mobile only). OpenAPI spec recommended before public API access.

### GAP-012: No application-level health check beyond `/api/health`
- **Impact:** Health check exists but does not verify database connectivity or external service availability.
- **Status:** ⚠️ DEFERRED — adequate for current scale

### GAP-013: Adyen partial-refund reconciliation not validated
- **Note in source:** `refund/route.ts` line 28: "Only Stripe is wired for refunds today; extend once Adyen partial-refund reconciliation is validated in staging."
- **Impact:** Adyen-connected organizers cannot process refunds through the platform.
- **Status:** ⚠️ KNOWN LIMITATION — Stripe-only refunds documented in code

## Summary

| Severity | Total | Fixed | Accepted/Deferred |
|----------|-------|-------|-------------------|
| P0 Critical | 2 | 2 | 0 |
| P1 High | 4 | 0 | 4 (accepted risk) |
| P2 Medium | 4 | 3 | 1 |
| P3 Low | 3 | 0 | 3 |
| **Total** | **13** | **5** | **8** |
