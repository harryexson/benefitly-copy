export type PaymentProvider = "stripe_connect" | "airwallex" | "nmi";

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
  createPayout(input: PayoutRequest): Promise<PayoutResult>;
  verifyWebhook(payload: string, signature: string): Promise<{ id: string; type: string; data: unknown }>;
}
