import { NextRequest, NextResponse } from "next/server";
import { billingReturnUrl, getStripeBilling, loadBillingContext } from "@/lib/billing";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export const POST = withRouteErrorHandling(async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });

  const { id } = await params;
  let context;
  try {
    context = await loadBillingContext(session.user.id, id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load billing";
    return NextResponse.json({ error: { code: message.includes("not authorized") ? "FORBIDDEN" : "BILLING_FAILED", message } }, { status: message.includes("not authorized") ? 403 : 400 });
  }
  if (!context.stripe_customer_id) {
    return NextResponse.json({ error: { code: "NO_SUBSCRIPTION", message: "This organization has no billing account yet." } }, { status: 409 });
  }

  const billing = getStripeBilling();
  if (!billing) return NextResponse.json({ error: { code: "PROVIDER_UNAVAILABLE", message: "Billing is not configured on this server." } }, { status: 503 });

  const url = await billing.createPortalSession(context.stripe_customer_id, billingReturnUrl(context.org_slug));
  return NextResponse.json({ data: { url } }, { status: 201 });
});
