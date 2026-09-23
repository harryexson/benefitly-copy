# Component inventory

## Keep as behaviour references; refactor UI and data boundary

* Members: `MemberForm`, `MembersTable`, `PendingMembersTable`, onboarding screens, member portal and financial dashboard.
* Benefits: `BenefitProgramDetails`, `BenefitProgramForm`, `BenefitPrograms`.
* Events: event cards/forms/details, check-in, tickets, registration, volunteers, calendar and analytics.
* Finance: contribution goal/transaction views, expenses, payment method, recurring contributions, payouts and reports.
* Community: announcements, messages, proposals, forums and notification center.
* Organization/admin: association users, roles, settings, billing, subscription, support and back-office screens.

## Replace

* `src/api/base44Client.js`, `src/lib/AuthContext.jsx`, `src/lib/app-params.js`, generated `pages.config.js`, and Vite routing shell: replace with Next.js server/client boundaries, application auth, and App Router.
* All provider entity calls and integrations: replace with typed API clients and domain services.
* Client-triggered privileged payment/payout/report code: replace with authenticated route handlers and jobs.

## Delete only after migration verification

* `base44/` hosted functions, provider Vite plugin/SDK, generated routing comments, and provider-specific runtime configuration.
* Duplicative UI primitives not adopted by the shared design system.

## Test priority

1. Member invite/join and role permission paths.
2. Contributions, recurring payments, refunds, payout approval and webhook idempotency.
3. Benefit claim submission/review, event ticket purchase/check-in, and communications.
4. Cross-tenant denial for every organization route.
