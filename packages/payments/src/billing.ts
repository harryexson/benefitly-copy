import Stripe from "stripe";

export type BillingInterval = "monthly" | "annual";

/** Stable Stripe lookup key for a plan price; scripts/stripe-billing-setup.mjs creates prices under these keys. */
export function billingPriceLookupKey(tier: string, interval: BillingInterval): string {
  return `benefitly_${tier}_${interval}`;
}

export class StripeBilling {
  private readonly client: Stripe;

  constructor(secretKey: string) {
    this.client = new Stripe(secretKey);
  }

  async priceIdFor(tier: string, interval: BillingInterval): Promise<string> {
    const lookupKey = billingPriceLookupKey(tier, interval);
    const { data } = await this.client.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
    if (!data[0]) throw new Error(`No Stripe price found for ${lookupKey}. Run scripts/stripe-billing-setup.mjs.`);
    return data[0].id;
  }

  async createCustomer(organizationId: string, name: string): Promise<string> {
    const customer = await this.client.customers.create(
      { name, metadata: { organizationId } },
      { idempotencyKey: `org-customer-${organizationId}` },
    );
    return customer.id;
  }

  async createSubscriptionCheckout(input: {
    customerId: string;
    priceId: string;
    organizationId: string;
    tier: string;
    founder: boolean;
    successUrl: string;
    cancelUrl: string;
  }): Promise<string> {
    const metadata = { organizationId: input.organizationId, tier: input.tier, founder: input.founder ? "true" : "false" };
    const session = await this.client.checkout.sessions.create({
      mode: "subscription",
      customer: input.customerId,
      line_items: [{ price: input.priceId, quantity: 1 }],
      client_reference_id: input.organizationId,
      metadata,
      subscription_data: { metadata },
      allow_promotion_codes: true,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    return session.url;
  }

  async createPortalSession(customerId: string, returnUrl: string): Promise<string> {
    const session = await this.client.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl });
    return session.url;
  }
}

/** Maps a Stripe subscription status to the organizations.subscription_status values. */
export function subscriptionStatusFromStripe(status: string): "active" | "past_due" | "canceled" | null {
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due") return "past_due";
  if (status === "canceled" || status === "unpaid" || status === "incomplete_expired") return "canceled";
  return null;
}
