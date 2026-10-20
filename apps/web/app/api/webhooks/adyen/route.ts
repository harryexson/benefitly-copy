import { NextRequest, NextResponse } from "next/server";
import { paymentProviderRouter } from "@/lib/payments";
import { processProviderWebhook } from "@/lib/webhook-processing";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!paymentProviderRouter.isConfigured("adyen_platforms")) {
    return NextResponse.json({ error: { code: "PROVIDER_UNAVAILABLE", message: "Adyen is not configured." } }, { status: 503 });
  }
  const payload = await request.text();

  let event;
  try {
    // Adyen's HMAC is validated per notification item against the platform's static key; there
    // is no header signature to pass, so the second argument is unused (see AdyenPlatformsAdapter).
    event = await paymentProviderRouter.for("adyen_platforms").verifyWebhook(payload, "");
  } catch {
    return NextResponse.json({ error: { code: "INVALID_SIGNATURE" } }, { status: 400 });
  }

  const item = event.data as { pspReference: string; eventCode: string; success?: string };
  if (item.eventCode === "AUTHORISATION") {
    await processProviderWebhook("adyen_platforms", event, item.pspReference, item.success === "true" ? "succeeded" : "failed");
  }

  // Adyen requires this literal acknowledgement body.
  return new NextResponse("[accepted]");
}
