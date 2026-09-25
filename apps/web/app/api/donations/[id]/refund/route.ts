import { NextRequest, NextResponse } from "next/server";
import { refundRequestSchema } from "@benefitly/validation";
import { sql, withUserContext } from "@/lib/database";
import { paymentProviderRouter } from "@/lib/payments";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });

  const { id: donationId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = refundRequestSchema.safeParse({ ...body, donationId });
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "INVALID_BODY", message: parsed.error.message } }, { status: 400 });
  }
  const input = parsed.data;

  const [donation] = await sql`select provider_payment_id, gross_amount, currency from public.donations where id = ${input.donationId} and status = 'succeeded'`;
  if (!donation) {
    return NextResponse.json({ error: { code: "NOT_REFUNDABLE", message: "Donation not found or not in a refundable state." } }, { status: 404 });
  }
  // Only Stripe is wired for refunds today; extend once Adyen partial-refund reconciliation is validated in staging.
  const refund = await paymentProviderRouter.for("stripe_connect").refundDonation({
    providerPaymentId: donation.provider_payment_id as string,
    amount: input.amount,
    idempotencyKey: input.idempotencyKey,
    reason: input.reason,
  });

  try {
    const [[updated]] = await withUserContext(session.user.id, (tx) => [
      tx`select * from public.refund_donation_ledger(${input.donationId}, ${input.amount ?? donation.gross_amount}, ${refund.providerRefundId})`,
    ]);
    return NextResponse.json({ data: { donation: updated, refund } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Refund ledger update failed";
    return NextResponse.json({ error: { code: message.includes("not authorized") ? "FORBIDDEN" : "REFUND_FAILED", message } }, { status: message.includes("not authorized") ? 403 : 400 });
  }
}
