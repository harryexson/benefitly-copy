export type PaymentProvider = "stripe_connect" | "adyen_platforms" | "airwallex" | "nmi";

export type PayoutState =
  | "pending"
  | "verification_required"
  | "approved"
  | "processing"
  | "paid"
  | "failed"
  | "reversed"
  | "canceled";

export type ConnectedAccount = {
  provider: PaymentProvider;
  providerAccountId: string;
  status: "pending" | "active" | "restricted" | "disabled";
  onboardingUrl?: string;
};

export type PayoutRequest = {
  accountId: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
  reference: string;
};

export type PayoutResult = {
  providerPayoutId: string;
  status: PayoutState;
};

export type DonationChargeState = "requires_action" | "processing" | "succeeded" | "failed" | "canceled";

export type DonationChargeRequest = {
  /** Connected account that ultimately receives the net campaign amount. */
  destinationAccountId: string;
  /** Gross amount the donor is charged, in integer minor units. */
  grossAmount: number;
  /** Voluntary platform contribution ("tip"), already included in grossAmount. */
  platformContribution: number;
  currency: string;
  idempotencyKey: string;
  campaignId: string;
  donorEmail?: string;
  statementDescriptor?: string;
  metadata?: Record<string, string>;
};

export type DonationChargeResult = {
  providerPaymentId: string;
  clientSecret?: string;
  redirectUrl?: string;
  status: DonationChargeState;
};

export type RefundRequest = {
  providerPaymentId: string;
  amount?: number;
  idempotencyKey: string;
  reason?: "requested_by_customer" | "fraudulent" | "duplicate";
};

export type RefundResult = {
  providerRefundId: string;
  status: "pending" | "succeeded" | "failed";
};

export type WebhookEvent = { id: string; type: string; data: unknown };

/**
 * Boundary for regulated payment providers. Provider SDKs belong in server-only
 * adapters; application workflows must depend on this contract instead.
 */
export interface PaymentProviderAdapter {
  readonly provider: PaymentProvider;
  createConnectedAccount(input: {
    ownerId: string;
    country: string;
    type: "individual" | "business";
  }): Promise<ConnectedAccount>;
  createOnboardingLink(accountId: string, returnUrl: string, refreshUrl: string): Promise<string>;
  /** Guest/donor checkout: a single charge split between the connected account and the platform. */
  createDonationCharge(input: DonationChargeRequest): Promise<DonationChargeResult>;
  refundDonation(input: RefundRequest): Promise<RefundResult>;
  createPayout(input: PayoutRequest): Promise<PayoutResult>;
  verifyWebhook(payload: string, signature: string): Promise<WebhookEvent>;
}
