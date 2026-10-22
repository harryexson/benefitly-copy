import type { WebhookEvent } from "@benefitly/domain";
import { subscriptionStatusFromStripe } from "@benefitly/payments";

export type SubscriptionUpdate = {
  organizationId: string;
  tier: string;
  status: "active" | "past_due" | "canceled";
  subscriptionId: string | null;
};

/**
 * Translates a Stripe Billing event into the organization's subscription state. Returns null for
 * events that don't change it (for example a subscription still awaiting its first payment).
 */
export function subscriptionUpdateFromEvent(event: WebhookEvent): SubscriptionUpdate | null {
  const object = event.data as { id?: string; mode?: string; status?: string; subscription?: string | null; metadata?: Record<string, string> };

  if (event.type === "checkout.session.completed") {
    const { organizationId, tier } = { organizationId: object.metadata?.organizationId, tier: object.metadata?.tier };
    if (object.mode !== "subscription" || !organizationId || !tier || !object.subscription) return null;
    return { organizationId, tier, status: "active", subscriptionId: object.subscription };
  }

  if (event.type === "customer.subscription.deleted") {
    const organizationId = object.metadata?.organizationId;
    if (!organizationId) return null;
    return { organizationId, tier: "free", status: "canceled", subscriptionId: null };
  }

  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
    const organizationId = object.metadata?.organizationId;
    const tier = object.metadata?.tier;
    if (!organizationId || !tier || !object.id) return null;
    const status = subscriptionStatusFromStripe(object.status ?? "");
    if (!status) return null;
    if (status === "canceled") return { organizationId, tier: "free", status, subscriptionId: null };
    return { organizationId, tier, status, subscriptionId: object.id };
  }

  return null;
}
