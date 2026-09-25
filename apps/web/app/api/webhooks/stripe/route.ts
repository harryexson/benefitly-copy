import { NextRequest, NextResponse } from "next/server";
import { paymentProviderRouter } from "@/lib/payments";
import { processProviderWebhook } from "@/lib/webhook-processing";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
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

  const intent = event.data as { id: string; application_fee_amount?: number; charges?: { data?: Array<{ balance_transaction?: { fee?: number } }> } };
  if (event.type === "payment_intent.succeeded") {
    await processProviderWebhook("stripe_connect", event, intent.id, "succeeded", intent.charges?.data?.[0]?.balance_transaction?.fee ?? 0);
  } else if (event.type === "payment_intent.payment_failed" || event.type === "payment_intent.canceled") {
    await processProviderWebhook("stripe_connect", event, intent.id, "failed");
  }
  // Other event types (transfers, payouts, disputes, account updates) are not yet handled here;
  // extend processProviderWebhook's callers as those flows are built.

  return NextResponse.json({ received: true });
}
