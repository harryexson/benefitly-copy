import { NextRequest, NextResponse } from "next/server";
import { billingCheckoutSchema } from "@benefitly/validation";
import { withUserContext } from "@/lib/database";
import { billingReturnUrl, getStripeBilling, loadBillingContext, sellablePlanTiers } from "@/lib/billing";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export const POST = withRouteErrorHandling(async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = billingCheckoutSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_BODY", message: parsed.error.message } }, { status: 400 });

  let context;
  try {
    context = await loadBillingContext(session.user.id, id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load billing";
    return NextResponse.json({ error: { code: message.includes("not authorized") ? "FORBIDDEN" : "BILLING_FAILED", message } }, { status: message.includes("not authorized") ? 403 : 400 });
  }
  if (!sellablePlanTiers().includes(parsed.data.tier)) {
    return NextResponse.json({ error: { code: "PLAN_NOT_AVAILABLE", message: "This plan is not available to buy yet." } }, { status: 409 });
  }
  if (context.subscription_status === "active") {
    return NextResponse.json({ error: { code: "ALREADY_SUBSCRIBED", message: "This organization already has an active subscription. Use Manage billing to change or cancel it." } }, { status: 409 });
  }

  const billing = getStripeBilling();
  if (!billing) return NextResponse.json({ error: { code: "PROVIDER_UNAVAILABLE", message: "Billing is not configured on this server." } }, { status: 503 });

  let customerId = context.stripe_customer_id;
  if (!customerId) {
    const created = await billing.createCustomer(id, context.org_name);
    const [[saved]] = await withUserContext(session.user.id, (tx) => [tx`select public.save_organization_stripe_customer(${id}, ${created}) as customer_id`]);
    customerId = (saved as { customer_id: string }).customer_id;
  }

  const priceId = await billing.priceIdFor(parsed.data.tier, parsed.data.interval);
  const url = await billing.createSubscriptionCheckout({
    customerId,
    priceId,
    organizationId: id,
    tier: parsed.data.tier,
    successUrl: billingReturnUrl(context.org_slug, "success"),
    cancelUrl: billingReturnUrl(context.org_slug, "canceled"),
  });

  return NextResponse.json({ data: { url } }, { status: 201 });
});
