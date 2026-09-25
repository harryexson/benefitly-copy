import { NextRequest, NextResponse } from "next/server";
import { payoutRequestSchema } from "@benefitly/validation";
import { withUserContext } from "@/lib/database";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Requests a payout. This only records the request at `pending`; moving it to `approved` and
 * calling the provider adapter's `createPayout` is a separate admin/finance-approval step, not
 * performed here, matching the dual-approval guardrail in the payment-provider decision doc.
 */
export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = payoutRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "INVALID_BODY", message: parsed.error.message } }, { status: 400 });
  }
  const input = parsed.data;

  try {
    const [[payout]] = await withUserContext(session.user.id, (tx) => [
      tx`select * from public.request_payout(${input.campaignId}, ${input.paymentAccountId}, ${input.amount}, ${input.currency}, ${input.idempotencyKey})`,
    ]);
    return NextResponse.json({ data: payout }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payout request failed";
    return NextResponse.json({ error: { code: message.includes("not authorized") ? "FORBIDDEN" : "PAYOUT_FAILED", message } }, { status: message.includes("not authorized") ? 403 : 400 });
  }
}
