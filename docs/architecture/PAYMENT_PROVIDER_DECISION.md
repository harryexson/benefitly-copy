# Payment-provider decision

## Decision

Benefitly keeps payment processing behind the `PaymentProviderAdapter` contract in `@benefitly/domain`. `@benefitly/payments` now implements this contract for both **Stripe Connect** and **Adyen for Platforms**, so the marketplace/connected-account, guest-checkout, payout and webhook-verification code paths exist and typecheck for both providers. Neither adapter's SDK is *reachable* at runtime, however, until the business, compliance and country rollout decisions below are approved: `createPaymentProviderRouterFromEnv` (in `packages/payments/src/config.ts`) only registers a provider when its full credential set (secret/API key, webhook/HMAC secret, account identifiers) is present in the environment. With no credentials configured, `PaymentProviderRouter.isConfigured(...)` returns `false` and every API route that would call the provider returns `503` instead.

For the initial US launch, **Stripe Connect** remains the preferred provider to launch first. It has the most direct marketplace/connected-account model for campaign organizers, onboarding, transfers and payout reconciliation. **Adyen for Platforms** is built as a parallel, equally-complete adapter (organizer onboarding via Legal Entity Management + Balance Platform account holders, donor charges via the Checkout Sessions API with `splits`, payouts via the Transfers API) so a second-provider or higher-volume/international path does not require new adapter code -- only new credentials and the same sandbox verification the guardrails below already require of Stripe.

## Approved evaluation paths

| Provider | Appropriate role | Decision criteria |
| --- | --- | --- |
| Stripe Connect | Default launch candidate for connected accounts, onboarding, charges/transfers and payout reporting. | Confirm supported countries, nonprofit/crowdfunding policy, pricing, reserve policy and verification requirements. |
| Airwallex Connected Accounts | Parallel evaluation for international expansion, multi-currency collection, wallets and cross-border payout needs. | Confirm connected-account availability in target countries, required commercial agreement, payout corridors, KYC ownership and pricing. |
| NMI | Acquiring/gateway or payment-facilitator enablement option when Benefitly has a sponsoring acquirer and wants to own more of the payments program. | Not a drop-in replacement for Connect. Requires a processor/acquirer relationship, program design, risk/underwriting and operational ownership. |
| Adyen for Platforms | Adapter implemented (`AdyenPlatformsAdapter`) as a parallel launch/expansion candidate for a higher-volume, multi-market marketplace program. | Evaluate real onboarding before enabling: confirm projected scale and regional coverage justify enterprise onboarding and commercial commitments, then run the sandbox checklist below same as Stripe. |

## Guardrails

- Money is stored in integer minor units; the ledger is immutable and separate from provider event IDs.
- Every provider call must use a persisted idempotency key and record a provider event ID.
- Webhooks are signature-verified, stored once, and processed asynchronously; redirect results are never treated as payment proof.
- Payout creation requires an approved account, organization authorization, dual approval where configured, and an audit-log event.
- The database never stores PAN, bank-account numbers, or provider secret keys.
- Provider account status and payout state are mapped to Benefitly-owned enums; provider-specific fields live in metadata only.

## Implementation

- `packages/payments/src/adapters/stripe-connect.ts` -- Express connected accounts, destination charges (`application_fee_amount` funds the voluntary platform contribution), `payouts.create` scoped to the connected account, refunds with `reverse_transfer`/`refund_application_fee`, and `stripe.webhooks.constructEvent` signature verification.
- `packages/payments/src/adapters/adyen-platforms.ts` -- legal entity + balance-account-holder onboarding via Legal Entity Management and Balance Platform APIs, donor charges via the Checkout Sessions API with `splits` (a `BalanceAccount` split for the campaign, a `Commission` split for the platform contribution), `TransfersApi.transferFunds` payouts, and per-notification-item HMAC verification (Adyen has no single request-level signature header the way Stripe does).
- `packages/payments/src/fees.ts` -- `computeDonationSplit` is the single place gross/net/contribution math happens; Benefitly never deducts a mandatory fee from campaign proceeds, only the donor's optional contribution.
- `packages/payments/src/router.ts` + `config.ts` -- `PaymentProviderRouter` resolves the adapter per campaign; `createPaymentProviderRouterFromEnv` only registers a provider when its full credential set is present, so an unconfigured environment has zero reachable provider SDK calls.
- `database/migrations/0003_crowdfunding_trust.sql` -- durable webhook event ledger (`webhook_events`, unique on `(provider, provider_event_id)` so a duplicate delivery is a no-op), the platform-contribution ledger, an idempotent-request table, and security-definer functions (`create_pending_donation`, `settle_donation`, `fail_donation`, `refund_donation_ledger`, `request_payout`, `upsert_payment_account`) that are the *only* way application code can write donations/ledger/payouts -- direct table writes remain revoked.

## Before enabling live money movement

1. Complete counsel/compliance review for charitable solicitation, sanctions screening, KYC/KYB, AML and donor receipt obligations in launch jurisdictions.
2. Configure provider accounts, webhook secrets, return URLs, payout schedules, reserves and dispute/refund handling.
3. Run sandbox tests for onboarding, payment success/failure, duplicate webhook delivery, refunds, payouts, reversals and provider outages.
4. Obtain finance-owner sign-off for reconciliation and a support-owner sign-off for donor and organizer incident flows.

## Sources

- Stripe Connect: <https://docs.stripe.com/connect/enable-payment-acceptance-guide>
- Airwallex Connected Accounts: <https://www.airwallex.com/docs/connected-accounts/get-started/get-started-with-connected-accounts>
- NMI payment-facilitator guidance: <https://www.nmi.com/who-we-serve/payment-facilitators/>
- Adyen Platforms payouts: <https://docs.adyen.com/platforms/quickstart-guide/payouts>
