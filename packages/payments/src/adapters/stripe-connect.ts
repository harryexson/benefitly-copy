import Stripe from "stripe";
import type {
  ConnectedAccount,
  DonationChargeRequest,
  DonationChargeResult,
  PaymentProviderAdapter,
  PayoutRequest,
  PayoutResult,
  RefundRequest,
  RefundResult,
  WebhookEvent,
} from "@benefitly/domain";

export type StripeConnectAdapterConfig = {
  secretKey: string;
  webhookSecret: string;
  /** Stripe Connect account type used for organizer onboarding. */
  accountType?: "express" | "standard";
};

const chargeStateMap: Record<string, DonationChargeResult["status"]> = {
  requires_payment_method: "requires_action",
  requires_confirmation: "requires_action",
  requires_action: "requires_action",
  processing: "processing",
  requires_capture: "processing",
  succeeded: "succeeded",
  canceled: "canceled",
};

const payoutStateMap: Record<string, PayoutResult["status"]> = {
  pending: "pending",
  in_transit: "processing",
  paid: "paid",
  failed: "failed",
  canceled: "canceled",
};

/**
 * Stripe Connect adapter for the initial US launch. Organizers onboard as Express connected
 * accounts; donor charges use destination charges with `application_fee_amount` so the
 * voluntary platform contribution is captured automatically and the remainder is transferred
 * to the campaign's connected account in the same transaction.
 */
export class StripeConnectAdapter implements PaymentProviderAdapter {
  readonly provider = "stripe_connect" as const;
  private readonly client: Stripe;
  private readonly webhookSecret: string;
  private readonly accountType: "express" | "standard";

  constructor(config: StripeConnectAdapterConfig) {
    if (!config.secretKey) throw new Error("StripeConnectAdapter requires a secretKey");
    if (!config.webhookSecret) throw new Error("StripeConnectAdapter requires a webhookSecret");
    this.client = new Stripe(config.secretKey, { apiVersion: "2025-02-24.acacia" });
    this.webhookSecret = config.webhookSecret;
    this.accountType = config.accountType ?? "express";
  }

  async createConnectedAccount(input: { ownerId: string; country: string; type: "individual" | "business" }): Promise<ConnectedAccount> {
    const account = await this.client.accounts.create({
      type: this.accountType,
      country: input.country,
      business_type: input.type === "business" ? "company" : "individual",
      capabilities: { transfers: { requested: true }, card_payments: { requested: true } },
      metadata: { benefitlyOwnerId: input.ownerId },
    });
    return {
      provider: this.provider,
      providerAccountId: account.id,
      status: mapAccountStatus(account),
    };
  }

  async createOnboardingLink(accountId: string, returnUrl: string, refreshUrl: string): Promise<string> {
    const link = await this.client.accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      return_url: returnUrl,
      refresh_url: refreshUrl,
    });
    return link.url;
  }

  async createDonationCharge(input: DonationChargeRequest): Promise<DonationChargeResult> {
    const intent = await this.client.paymentIntents.create(
      {
        amount: input.grossAmount,
        currency: input.currency.toLowerCase(),
        application_fee_amount: input.platformContribution,
        transfer_data: { destination: input.destinationAccountId },
        statement_descriptor_suffix: input.statementDescriptor?.slice(0, 22),
        receipt_email: input.donorEmail,
        metadata: { campaignId: input.campaignId, ...input.metadata },
        automatic_payment_methods: { enabled: true },
      },
      { idempotencyKey: input.idempotencyKey },
    );
    return {
      providerPaymentId: intent.id,
      clientSecret: intent.client_secret ?? undefined,
      status: chargeStateMap[intent.status] ?? "processing",
    };
  }

  async refundDonation(input: RefundRequest): Promise<RefundResult> {
    const refund = await this.client.refunds.create(
      {
        payment_intent: input.providerPaymentId,
        amount: input.amount,
        reason: input.reason === "duplicate" ? "duplicate" : input.reason === "fraudulent" ? "fraudulent" : "requested_by_customer",
        // Reverse the platform contribution along with the campaign portion so a refunded
        // donation never leaves a stranded application fee.
        reverse_transfer: true,
        refund_application_fee: true,
      },
      { idempotencyKey: input.idempotencyKey },
    );
    return {
      providerRefundId: refund.id,
      status: refund.status === "succeeded" ? "succeeded" : refund.status === "failed" ? "failed" : "pending",
    };
  }

  async createPayout(input: PayoutRequest): Promise<PayoutResult> {
    const payout = await this.client.payouts.create(
      { amount: input.amount, currency: input.currency.toLowerCase(), metadata: { reference: input.reference } },
      { idempotencyKey: input.idempotencyKey, stripeAccount: input.accountId },
    );
    return { providerPayoutId: payout.id, status: payoutStateMap[payout.status] ?? "processing" };
  }

  async verifyWebhook(payload: string, signature: string): Promise<WebhookEvent> {
    const event = this.client.webhooks.constructEvent(payload, signature, this.webhookSecret);
    return { id: event.id, type: event.type, data: event.data.object };
  }
}

function mapAccountStatus(account: Stripe.Account): ConnectedAccount["status"] {
  if (account.requirements?.disabled_reason) return "disabled";
  if (account.charges_enabled && account.payouts_enabled) return "active";
  if (account.requirements?.currently_due?.length) return "restricted";
  return "pending";
}
