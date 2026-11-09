# Benefitly — Environment Configuration

## Required Environment Variables

### Database
| Variable | Example | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://benefitly_app:...@...neon.tech/benefitly` | Neon PostgreSQL connection string. Must use the `benefitly_app` role for RLS enforcement. |

### Authentication
| Variable | Example | Description |
|----------|---------|-------------|
| `BETTER_AUTH_SECRET` | (random 32+ char string) | Session signing secret. Must be cryptographically random in production. |
| `BETTER_AUTH_TRUSTED_ORIGINS` | `https://benefitly-web.vercel.app` | Comma-separated list of trusted origins for CORS. |

### Application
| Variable | Example | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_APP_URL` | `https://benefitly-web.vercel.app` | Public-facing URL. Used for email links, QR codes, ticket confirmation URLs. |

### Payments (Stripe Connect)
| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | Yes (for payments) | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | Yes (for webhooks) | Stripe webhook endpoint signing secret |

### Payments (Adyen — optional)
| Variable | Required | Description |
|----------|----------|-------------|
| `ADYEN_API_KEY` | If using Adyen | Adyen API key |
| `ADYEN_MERCHANT_ACCOUNT` | If using Adyen | Adyen merchant account ID |
| `ADYEN_HMAC_KEY` | If using Adyen | Adyen webhook HMAC key |

### Communications (optional)
| Variable | Required | Description |
|----------|----------|-------------|
| `RESEND_API_KEY` | For email | Resend API key for transactional emails |
| `TWILIO_ACCOUNT_SID` | For SMS | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | For SMS | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | For SMS | Twilio sender phone number |

## Local Development

```bash
# Copy the example env file
cp apps/web/.env.local.example apps/web/.env.local

# Edit with your local values
# DATABASE_URL should point to a local Neon branch or local PostgreSQL
```

The `.env.local` file in the repository contains safe local-dev defaults (not real credentials).

## Database Setup

1. Create a Neon project (or local PostgreSQL)
2. Create the `benefitly_app` role: `CREATE ROLE benefitly_app WITH LOGIN PASSWORD '...'`
3. Apply all migrations in order: `psql -f database/migrations/0001_initial_schema.sql` through `0014_ticketed_events.sql`
4. The migrations create all tables, RLS policies, and SECURITY DEFINER functions

## Vercel Deployment

The app deploys to Vercel with `output: "standalone"` mode. Environment variables are configured in the Vercel project settings. The build command is `next build` from the `apps/web` directory.

## Security Notes

- Never commit real credentials to the repository
- `BETTER_AUTH_SECRET` must be unique per environment and cryptographically random
- Stripe webhook secrets are per-endpoint — the production secret differs from staging
- The `DATABASE_URL` must use the `benefitly_app` role, never `neondb_owner`, in production

## Organization subscriptions (Stripe Billing)

- `STRIPE_SECRET_KEY`: the platform's Stripe secret key. Subscriptions are billed to the platform's
  own Stripe account; donor and member money never flows through it.
- Create the subscription products and prices once per Stripe account (idempotent):

  ```bash
  STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-billing-setup.mjs
  ```

  Prices come from `scripts/billing-prices.json`, which must match the prices in
  `database/migrations/0025_approved_pricing.sql`.
- The Stripe webhook endpoint must subscribe to `checkout.session.completed` and the
  `customer.subscription.*` events, in addition to the payment events it already receives.

## Scheduled reports and API keys

- `CRON_SECRET`: shared secret for `/api/cron/reports`. Vercel Cron sends it as a bearer token
  (`vercel.json` runs the job daily at 08:00 UTC). Set it in the Vercel project; without it the job
  refuses every request.
- Scheduled report and dues reminder emails need `RESEND_API_KEY` and `RESEND_FROM_EMAIL`.
- API keys are shown once when created; only their hash is stored. Keys are read-only.

## Monitoring, rate limits and plan availability

- `ERROR_REPORT_WEBHOOK_URL` (optional): every unhandled route error is POSTed here as JSON, with
  emails and API keys redacted. Point it at your error tracker's webhook or an ingestion endpoint.
  Errors are always written to the platform log (Vercel captures stdout and stderr) regardless.
- `/api/health` returns 503 when the database does not answer. Point an uptime monitor at it.
- Public write endpoints are rate limited per client address, using the `rate_limit_buckets` counters in
  the database: donations and tickets (20 per 10 minutes), check-in (10 per minute), campaign reports
  (5 per hour), invitation acceptance (10 per 10 minutes), and support tickets (10 per hour).
- `SELLABLE_PLAN_TIERS` (optional, comma-separated): paid tiers that can be bought. Defaults to
  `starter`. Growth, Scale and Enterprise stay unsellable until their feature lists are confirmed.
