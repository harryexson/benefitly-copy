import { NextRequest, NextResponse } from "next/server";
import { memberDuesSchema } from "@benefitly/validation";
import { withUserContext } from "@/lib/database";
import { paymentProviderRouter } from "@/lib/payments";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

/**
 * Starts a dues payment. The charge is created directly on the organization's connected Stripe
 * account, so funds settle there and never pass through the platform balance. The client confirms
 * the PaymentIntent with `stripeAccountId`; the Stripe webhook then settles the pending row.
 */
export const POST = withRouteErrorHandling(async function POST(request: NextRequest, { params }: { params: Promise<{ memberId: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });

  const { memberId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = memberDuesSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_BODY", message: parsed.error.message } }, { status: 400 });
  const input = parsed.data;

  const [[destination]] = await withUserContext(session.user.id, (tx) => [
    tx`select provider_account_id from public.member_dues_destination(${memberId})`,
  ]);
  if (!destination) {
    return NextResponse.json({ error: { code: "DUES_NOT_PAYABLE", message: "Dues cannot be paid yet: this organization has not finished setting up payments." } }, { status: 409 });
  }
  if (!paymentProviderRouter.isConfigured("stripe_connect")) {
    return NextResponse.json({ error: { code: "PROVIDER_UNAVAILABLE", message: "Payments are not configured on this server." } }, { status: 503 });
  }
  const adapter = paymentProviderRouter.for("stripe_connect");
  if (!adapter.createDirectCharge) {
    return NextResponse.json({ error: { code: "PROVIDER_UNAVAILABLE", message: "This provider cannot take direct dues payments." } }, { status: 503 });
  }

  const accountId = destination.provider_account_id as string;
  const charge = await adapter.createDirectCharge({
    accountId,
    amount: input.amount,
    currency: input.currency,
    idempotencyKey: input.idempotencyKey,
    metadata: { kind: "member_dues", memberId },
    receiptEmail: session.user.email,
  });

  await withUserContext(session.user.id, (tx) => [
    tx`select * from public.create_member_dues_payment(${memberId}, ${input.contributionType}, ${input.amount}, ${input.currency}, ${charge.providerPaymentId})`,
  ]);

  return NextResponse.json(
    { data: { paymentId: charge.providerPaymentId, clientSecret: charge.clientSecret, stripeAccountId: accountId, status: charge.status } },
    { status: 201 },
  );
});
