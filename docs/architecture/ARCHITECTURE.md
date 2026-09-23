# Benefitly target architecture

## Current state

The imported application is a Vite + React JavaScript single-page application. Its data, authentication, routing parameters, integrations, and privileged server operations are coupled to a third-party generated-app runtime. The repository contains 48 provider-hosted Deno functions and no portable database schema, migrations, or tests.

## Target

```text
apps/
  web/          Next.js App Router, public fundraising + authenticated workspaces
  mobile/       Expo Router native application
packages/
  domain/       campaign, membership, benefit, ledger and permission rules
  ui/           accessible, shared design tokens and web primitives
  validation/   shared Zod schemas
  types/        public TypeScript contracts
database/
  migrations/   Neon PostgreSQL schema, RLS policies, database functions
  seed/         non-production fixtures only
docs/
  migration/    audit and component/entity mapping
```

Next.js route handlers own privileged HTTP entry points. Domain services own authorization, idempotency, payment calculations, ledger writes and audit writes. Neon Postgres is the sole system of record. Authentication is application-managed (a TypeScript auth service with database-backed sessions); PostgreSQL RLS isolates every organization-scoped record after the server binds verified session claims to the database transaction. Stripe Connect remains behind a `PaymentService` adapter and webhooks are verified before state changes.

## Design direction

The product combines community care with credible financial administration: deep ink (`#12233F`), Benefitly blue (`#315EF5`), sea green (`#0F9B7A`), mist (`#F5F7FB`), and paper (`#FFFFFF`). The public experience uses editorial campaign imagery and calm, generous spacing; the organization workspace uses structured tables, clear money states and restrained blue accents. This is inspired by the supplied visual references, not a reproduction of them.

## Migration sequence

1. Preserve the imported source unchanged; complete this audit and capture provider data exports.
2. Create the monorepo, shared contracts and Neon migration baseline.
3. Migrate identity, tenant membership and authorization, then prove RLS with cross-tenant tests.
4. Replace server functions by bounded API/domain services and provider adapters. Verify webhooks and ledger writes before retiring payment flows.
5. Port association modules one workflow at a time, then add public fundraising.
6. Implement Expo UI against the same authenticated API; do not use a WebView.
7. Remove generated-app runtime only after dependency, behavioral and repository-wide checks pass.

## Gate 1 blockers

* No current database export, schema, tenant identifiers, or data-retention requirements were supplied.
* No Neon project connection string/branch policy, Stripe account/webhook secrets, email/SMS provider configuration, storage policy, or production domains were supplied.
* Existing provider function behaviour must be exercised in a safe staging account before any financial migration is certified.
