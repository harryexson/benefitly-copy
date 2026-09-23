# Generated-app dependency audit

Audit date: 2026-09-22. Scope: imported `benefitly-copy-main`. The application is a Vite + React SPA with a provider runtime client, 48 hosted Deno functions, and no portable database schema, migrations, or tests. A status of **blocked** means that safe migration needs provider data exports, credentials, and a staging verification run.

## Runtime and configuration

| File | Dependency / feature | Classification | Replacement | Status |
| --- | --- | --- | --- | --- |
| `package.json` | provider SDK + Vite plugin | CONFIGURATION | Next.js, Neon data access, native API clients | planned |
| `vite.config.js`, `index.html` | provider Vite bootstrapping | ROUTING | Next.js config and metadata | planned |
| `src/api/base44Client.js` | shared provider client | AUTH, DATABASE, SERVER_FUNCTION | Neon-backed API and application auth clients | blocked |
| `src/lib/app-params.js` | provider application parameters | CONFIGURATION | validated server environment | planned |
| `src/lib/AuthContext.jsx`, `Layout.jsx`, `PageNotFound.jsx`, `LandingPage.jsx`, `SubscriptionRestricted.jsx` | login, profile, redirects | AUTH | application auth + Next.js middleware | blocked |
| `src/pages.config.js`, `NavigationTracker.jsx` | generated routing | ROUTING | App Router routes and analytics adapter | planned |

## Direct client dependencies

| Files | Dependency / feature | Classification | Replacement | Status |
| --- | --- | --- | --- | --- |
| `BenefitProgramForm.jsx`, `BenefitPrograms.jsx` | program/claim CRUD | ENTITY | organization-scoped API + RLS | blocked |
| `ReceiptScanner.jsx`, `MarketAnalysis.jsx`, `MassCommunication.jsx`, `PayoutApproval.jsx` | Core/AI integration | OTHER | explicit approved adapter | blocked |
| `MemberForm.jsx`, `UserInviteForm.jsx`, `AssociationUsers.jsx`, `OnboardingWizard.jsx` | invite/welcome/onboarding | SERVER_FUNCTION | invitation service + email queue | planned |
| Event ticket components and `EventTicketSuccess.jsx` | ticket checkout/check-in | PAYMENT | EventRegistrationService + Stripe webhook | blocked |
| Member payment/payout components and `Payment.jsx`, `Payout*.jsx`, `Profile.jsx`, `StripeManagement.jsx`, `Settings.jsx` | bank setup, balances, payouts | PAYMENT | PaymentService / PayoutService | blocked |
| `Community.jsx`, `Proposals.jsx`, notification/report/communication screens | notifications, SMS, reports | EMAIL, SMS, SERVER_FUNCTION | queued jobs + provider adapters | blocked |
| `BackOffice*.jsx`, `EnterpriseContractManager.jsx`, `AssociationSignupForm.jsx` | administration, contracts, subscription | ADMIN, PAYMENT | platform RBAC + subscription service | blocked |

## Hosted function audit

Every `base44/functions/*/entry.ts` imports the hosted SDK. Migrate the following groups before deleting the directory:

| Functions | Classification | Target service |
| --- | --- | --- |
| `createContributionCheckout`, `createContributionCheckoutWithMethod`, `createMemberPaymentIntent`, `createRecurringPayment`, `cancelRecurringPayment`, `enableACHPayments` | PAYMENT | PaymentService with idempotency, ledger events, verified webhooks |
| `createEventTicketCheckout`, `confirmEventTicket`, `checkInEventTicket` | PAYMENT | EventRegistrationService with audit history |
| `createStripeOnboardingLink`, `initiateStripeOnboarding`, `setupMemberBankAccount`, `getMemberStripeBalance` | PAYMENT | StripeConnectAdapter with authorization |
| `processPayoutToMember`, `orchestratePayoutToMember`, `requestMemberPayout`, `processAdminPayout`, `bulkProcessPayouts`, `retryFailedPayouts` | PAYMENT | PayoutService, approval policy, ledger, job queue |
| `initiateTremendousConnect`, `processTremendousPayout`, `bulkProcessTremendousPayouts`, `tremendousOAuthCallback`, `tremendousWebhook` | PAYMENT | optional provider adapter pending contract review |
| `stripeWebhook`, `stripeConnectWebhook`, `handleSubscriptionWebhook` | PAYMENT | signed Next.js webhook handlers with durable idempotency |
| `createSubscriptionCheckout`, `generateEnterpriseCheckout`, `syncStripePrices` | PAYMENT | SubscriptionService + Stripe adapter |
| `sendTemplatedEmail`, `sendSMS`, `checkTwilioConfig`, `sendEventReminders`, `sendAutomatedReminders`, `triggerMemberWelcome`, `sendScheduledReport`, `setupDefaultEmailTemplates` | EMAIL, SMS | notification providers and scheduled jobs |
| `notifyForumActivity`, `notifyProposalUpdate`, `sendAnnouncementNotification` | OTHER | notification domain service |
| `generateReportPDF`, `generateTaxSummary`, `generateScheduledReport` | SERVER_FUNCTION | reporting job service |
| `inviteUser`, `createAdminMember`, `getUserPermissions`, `manageBackOfficeAuth` | AUTH, ADMIN | application auth admin API + permission service |

## Required verification

1. Export the provider data/schema and map all hidden fields to Neon migrations.
2. Obtain non-production Neon, Stripe, email/SMS, storage and domain credentials.
3. Exercise checkout, payout, ticket, invite, message and reporting flows in staging.
4. After replacements pass, delete runtime code and run a repository-wide search. This historical audit is the only intentional reference if retained.
