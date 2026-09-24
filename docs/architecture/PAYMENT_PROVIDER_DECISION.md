# Payment-provider decision

## Decision

Benefitly will keep payment processing behind the `PaymentProviderAdapter` contract in `@benefitly/domain`. No payment provider SDK is installed or called until the business, compliance and country rollout decisions are approved.

For the initial US launch, **Stripe Connect** is the preferred provider to evaluate first. It has the most direct marketplace/connected-account model for campaign organizers, onboarding, transfers and payout reconciliation.

## Approved evaluation paths

| Provider | Appropriate role | Decision criteria |
| --- | --- | --- |
| Stripe Connect | Default launch candidate for connected accounts, onboarding, charges/transfers and payout reporting. | Confirm supported countries, nonprofit/crowdfunding policy, pricing, reserve policy and verification requirements. |
| Airwallex Connected Accounts | Parallel evaluation for international expansion, multi-currency collection, wallets and cross-border payout needs. | Confirm connected-account availability in target countries, required commercial agreement, payout corridors, KYC ownership and pricing. |
| NMI | Acquiring/gateway or payment-facilitator enablement option when Benefitly has a sponsoring acquirer and wants to own more of the payments program. | Not a drop-in replacement for Connect. Requires a processor/acquirer relationship, program design, risk/underwriting and operational ownership. |
| Adyen for Platforms | Enterprise alternative for a higher-volume, multi-market marketplace program. | Evaluate only if projected scale and regional coverage justify enterprise onboarding and commercial commitments. |

## Guardrails

- Money is stored in integer minor units; the ledger is immutable and separate from provider event IDs.
- Every provider call must use a persisted idempotency key and record a provider event ID.
- Webhooks are signature-verified, stored once, and processed asynchronously; redirect results are never treated as payment proof.
- Payout creation requires an approved account, organization authorization, dual approval where configured, and an audit-log event.
- The database never stores PAN, bank-account numbers, or provider secret keys.
- Provider account status and payout state are mapped to Benefitly-owned enums; provider-specific fields live in metadata only.

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
