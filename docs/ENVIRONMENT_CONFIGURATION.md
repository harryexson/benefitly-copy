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
