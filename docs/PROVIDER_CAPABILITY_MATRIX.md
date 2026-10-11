# Benefitly — Payment Provider Capability Matrix

## Supported Providers

| Capability | Stripe Connect | Adyen Platforms | Airwallex | NMI |
|-----------|---------------|-----------------|-----------|-----|
| **Status** | ✅ Implemented | 🔧 Adapter exists | 📋 Type only | 📋 Type only |
| Onboarding | Express accounts | — | — | — |
| Donation charges | ✅ PaymentIntent | 🔧 Stub | — | — |
| Refunds | ✅ Full + partial | ❌ Not validated | — | — |
| Payouts | ✅ Transfers | 🔧 Stub | — | — |
| Webhooks | ✅ Signature verified | 🔧 Route exists | — | — |
| Fee calculation | ✅ `computeDonationSplit` | ✅ Same function | — | — |

## Architecture

### PaymentProviderRouter (`packages/payments`)

```typescript
interface PaymentProviderAdapter {
  createDonationCharge(params): Promise<ChargeResult>
  refundDonation(params): Promise<RefundResult>
  createPayout(params): Promise<PayoutResult>
  createOnboardingLink?(params): Promise<OnboardingResult>
}
```

The router dispatches to the correct adapter via `paymentProviderRouter.for(provider)`. The `isConfigured(provider)` check validates that required environment variables are set before attempting provider operations.

### Fee Model

**Zero mandatory platform fee.** Platform revenue comes from voluntary donor tips ("Keep Fundraising Free" model).

```typescript
computeDonationSplit({
  donationAmount: 5000,        // $50.00
  platformContribution: 500,   // $5.00 voluntary tip
  currency: "USD"
}) → {
  grossCharge: 5000,           // Total charged to donor
  netToCampaign: 4500,         // Goes to organizer
  platformContribution: 500,   // Platform revenue (tip)
  currency: "USD"
}
```

### Environment Variables

| Variable | Required For | Purpose |
|----------|-------------|---------|
| `STRIPE_SECRET_KEY` | Stripe Connect | API authentication |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhooks | Signature verification |
| `ADYEN_API_KEY` | Adyen Platforms | API authentication |
| `ADYEN_MERCHANT_ACCOUNT` | Adyen Platforms | Merchant identification |
| `ADYEN_HMAC_KEY` | Adyen webhooks | Signature verification |

### Webhook Event Processing

All webhook processing is idempotent via the `webhook_events` table:
1. `ingest_webhook_event(provider, eventId, type, data)` — returns `false` for duplicates
2. `settle_donation(paymentIntentId, processorFee)` or `fail_donation(paymentIntentId)` — only transitions `pending` rows
3. `mark_webhook_event_processed(provider, eventId, error?)` — records completion

### Known Limitations

1. **Adyen refunds:** Route hardcoded to Stripe (`paymentProviderRouter.for("stripe_connect")`). Adyen partial-refund reconciliation needs staging validation before enabling.
2. **Airwallex / NMI:** Types defined in `@benefitly/domain` but no adapter implementations exist.
3. **Multi-provider routing:** The donation and ticket routes read the provider from `campaign_donation_destination`, so campaigns are already provider-aware. Adding a new provider requires implementing the adapter interface and configuring the environment variables.
