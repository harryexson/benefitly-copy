import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/database";
import { paymentProviderRouter } from "@/lib/payments";
import { processProviderWebhook } from "@/lib/webhook-processing";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export const POST = withRouteErrorHandling(async function POST(request: NextRequest) {
  if (!paymentProviderRouter.isConfigured("stripe_connect")) {
    return NextResponse.json({ error: { code: "PROVIDER_UNAVAILABLE", message: "Stripe is not configured." } }, { status: 503 });
  }
  const signature = request.headers.get("stripe-signature");
  const payload = await request.text();
  if (!signature) return NextResponse.json({ error: { code: "MISSING_SIGNATURE" } }, { status: 400 });

  let event;
  try {
    event = await paymentProviderRouter.for("stripe_connect").verifyWebhook(payload, signature);
  } catch {
    return NextResponse.json({ error: { code: "INVALID_SIGNATURE" } }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded" || event.type === "payment_intent.payment_failed" || event.type === "payment_intent.canceled") {
    const intent = event.data as { id: string; charges?: { data?: Array<{ balance_transaction?: { fee?: number } }> } };
    await processProviderWebhook(
      "stripe_connect",
      event,
      intent.id,
      event.type === "payment_intent.succeeded" ? "succeeded" : "failed",
      intent.charges?.data?.[0]?.balance_transaction?.fee ?? 0,
    );
  } else if (event.type === "account.updated") {
    // Stripe reports Connect onboarding completion (and later restriction/disablement)
    // asynchronously here; nothing else ever updates payment_accounts.status after creation.
    const account = event.data as { id: string; charges_enabled?: boolean; payouts_enabled?: boolean; requirements?: { disabled_reason?: string | null } };
    const status = account.requirements?.disabled_reason ? "disabled" : account.charges_enabled && account.payouts_enabled ? "active" : "restricted";
    await sql`select public.update_payment_account_status('stripe_connect', ${account.id}, ${status})`;
  }
  // Other event types (transfers, payouts, disputes) are not yet handled here; extend
  // processProviderWebhook's callers or add another branch as those flows are built.

  return NextResponse.json({ received: true });
});
