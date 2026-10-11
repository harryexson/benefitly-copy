# Benefitly — Architecture & Dependency Map

## Repository Layout

```
benefitly-copy/
├── apps/
│   ├── web/          # Next.js 15.3.9 + React 19 (primary platform)
│   └── mobile/       # Expo SDK 53 React Native app
├── packages/
│   ├── domain/       # TypeScript types (PaymentProvider, adapters, trust)
│   ├── validation/   # Zod schemas for all API inputs
│   └── payments/     # Payment provider abstraction layer
├── database/
│   ├── migrations/   # 14 sequential SQL migrations (0001–0014)
│   └── tests/        # SQL integration test suite
├── src/              # Legacy Base44 SPA (SEPARATE system, not connected)
└── base44/functions/ # Legacy Deno serverless functions (SEPARATE system)
```

## Active Platform (`apps/web` + `apps/mobile` + `packages/*`)

### Runtime Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 15.3.9, React 19 | SSR + API routes |
| Mobile | Expo SDK 53, React Native | Shared API surface |
| Database | Neon PostgreSQL (serverless) | HTTP driver, no persistent connections |
| Auth | better-auth | Email+password, cookie sessions, Expo plugin |
| Payments | Stripe Connect (Express) | Organizer onboarding + donations + payouts |
| Hosting | Vercel | `benefitly-web.vercel.app` |
| Email | Resend | Ticket confirmations, sharing |
| SMS | Twilio | Ticket confirmations, sharing (optional) |

### Database Architecture

**Two-role model:**
- `neondb_owner`: Runs migrations, owns all SECURITY DEFINER functions
- `benefitly_app`: App runtime role, subject to RLS on all tables

**Key pattern — `withUserContext(userId, callback)`:**
```
sql.transaction([
  set_config('app.user_id', userId, true),
  ...userQueries
])
```
All RLS policies call `current_user_id()` which reads `app.user_id`. Plain `sql` queries outside `withUserContext` have no user identity bound — RLS ownership checks silently return zero rows.

**Write path:** All writes go through SECURITY DEFINER functions that perform internal authorization checks before modifying data. RLS acts as defense-in-depth on reads.

### API Route Map (42 routes)

**Public (no auth):**
- `GET /api/campaigns` — published campaign listing
- `GET /api/campaigns/by-slug/[slug]` — single campaign
- `GET /api/campaigns/[id]/events` — event listing
- `GET /api/campaigns/[id]/events/[eventId]/ticket-types` — ticket types
- `POST /api/checkin` — self-service ticket check-in (code = bearer token)
- `POST /api/webhooks/stripe` — Stripe webhook (signature verified)
- `POST /api/webhooks/adyen` — Adyen webhook (signature verified)
- `GET /api/health` — health check

**Mixed (guest + authenticated):**
- `POST /api/donations` — create donation (guest checkout supported)
- `POST /api/campaigns/[id]/report` — report campaign (anonymous allowed)
- `POST /api/campaigns/[id]/events/[eventId]/tickets` — purchase tickets

**Authenticated (session required):**
- `POST /api/campaigns` — create campaign
- `POST /api/payouts` — request payout
- `POST /api/donations/[id]/refund` — refund donation
- `POST /api/organizer/register` — Stripe Connect onboarding
- `POST /api/campaigns/[id]/media` — upload media
- `DELETE /api/campaigns/[id]/media/[mediaId]` — delete media
- `POST /api/campaigns/[id]/updates` — post update
- `POST /api/campaigns/[id]/share/email` — share via email
- `POST /api/campaigns/[id]/share/sms` — share via SMS
- `GET /api/me/campaigns` — user's campaigns
- `POST /api/me/push-tokens` — register push token
- `GET /api/me/notifications` — user notifications
- `POST /api/me/notifications/[id]/read` — mark read
- `POST /api/me/saved-campaigns` — save/unsave
- `POST /api/me/giving-plans` — create giving plan
- `PATCH /api/me/giving-plans/[id]` — update giving plan
- Organization CRUD routes (members, events, benefits, announcements)

**Admin (session + isPlatformAdmin):**
- `GET /api/admin/payouts` — pending payouts
- `POST /api/admin/payouts/[id]/approve` — approve + execute payout
- `POST /api/admin/moderation` — moderation decisions
- `POST /api/admin/organizations/[id]/plan` — change org plan tier

### Payment Flow

```
Donor → POST /api/donations → create_pending_donation (DB) → Stripe PaymentIntent
                                                                   ↓
Stripe webhook → POST /api/webhooks/stripe → settle_donation (DB) → notify owner
                                                                   ↓
Owner → POST /api/payouts → request_payout (DB, status=pending)
                                                                   ↓
Admin → POST /api/admin/payouts/[id]/approve → approve_payout (DB) → Stripe Transfer → mark_payout_executed (DB)
```

### Package Dependencies

```
apps/web
├── @benefitly/domain      (types only, no runtime deps)
├── @benefitly/validation   (zod schemas)
├── @benefitly/payments     (provider abstraction)
├── @neondatabase/serverless
├── better-auth
├── stripe
└── next 15.3.9

apps/mobile
├── @benefitly/domain
├── @benefitly/validation
├── expo ~53
└── react-native

packages/payments
├── @benefitly/domain
└── stripe
```

## Legacy System (`src/` + `base44/functions/`)

Entirely separate Base44 SPA with 48 Deno serverless functions. Focuses on association/membership management. Shares no runtime code, database, or API surface with the active platform. Not covered by this audit.
