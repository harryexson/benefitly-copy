import { StripeBilling } from "@benefitly/payments";
import { withUserContext } from "@/lib/database";

let cachedBilling: StripeBilling | null | undefined;

export function getStripeBilling(): StripeBilling | null {
  if (cachedBilling !== undefined) return cachedBilling;
  const key = process.env.STRIPE_SECRET_KEY;
  cachedBilling = key ? new StripeBilling(key) : null;
  return cachedBilling;
}

export type BillingContext = {
  org_name: string;
  org_slug: string;
  plan_tier: string;
  subscription_status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

/** Throws "not authorized to manage billing" unless the caller holds organization.manage. */
export async function loadBillingContext(userId: string, organizationId: string): Promise<BillingContext> {
  const [[context]] = await withUserContext(userId, (tx) => [tx`select * from public.organization_billing_context(${organizationId})`]);
  return context as unknown as BillingContext;
}

export function billingReturnUrl(slug: string, status?: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://benefitly-web.vercel.app";
  return `${base}/org/${slug}/billing${status ? `?checkout=${status}` : ""}`;
}
