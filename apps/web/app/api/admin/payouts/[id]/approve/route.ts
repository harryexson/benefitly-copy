import { NextResponse } from "next/server";
import type { PaymentProvider } from "@benefitly/domain";
import { sql, withUserContext } from "@/lib/database";
import { paymentProviderRouter } from "@/lib/payments";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";
import { notify } from "@/lib/notifications";

export const dynamic = "force-dynamic";

/**
 * Two-step, dual-approval-friendly payout execution: `approve_payout` (admin-checked in SQL)
 * moves the row from pending to approved; only after that succeeds do we call the payment
 * provider, then record the outcome with `mark_payout_executed`/`mark_payout_failed`. A payout
 * that fails after approval stays visible as 'failed' rather than silently reverting, so it
 * shows up for manual follow-up instead of being retried automatically.
 */
export const POST = withRouteErrorHandling(async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });

  const { id: payoutId } = await params;

  let approved: {
    id: string;
    campaign_id: string;
    amount: number;
    currency: string;
    idempotency_key: string;
    payment_account_id: string;
  };
  try {
    const [[row]] = await withUserContext(session.user.id, (tx) => [
      tx`select id, campaign_id, amount, currency, idempotency_key, payment_account_id from public.approve_payout(${payoutId})`,
    ]);
    approved = row as typeof approved;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not approve payout";
    return NextResponse.json({ error: { code: message.includes("not authorized") ? "FORBIDDEN" : "APPROVE_FAILED", message } }, { status: message.includes("not authorized") ? 403 : 400 });
  }

  const [[account]] = await withUserContext(session.user.id, (tx) => [
    tx`select provider, provider_account_id from public.payment_accounts where id = ${approved.payment_account_id}`,
  ]);
  const provider = (account as { provider: PaymentProvider })?.provider;

  if (!provider || !paymentProviderRouter.isConfigured(provider)) {
    await withUserContext(session.user.id, (tx) => [tx`select public.mark_payout_failed(${payoutId})`]);
    return NextResponse.json({ error: { code: "PROVIDER_UNAVAILABLE", message: `${provider ?? "This provider"} is not configured on this server.` } }, { status: 503 });
  }

  try {
    const result = await paymentProviderRouter.for(provider).createPayout({
      accountId: (account as { provider_account_id: string }).provider_account_id,
      amount: approved.amount,
      currency: approved.currency,
      idempotencyKey: approved.idempotency_key,
      reference: payoutId,
    });
    const [[updated]] = await withUserContext(session.user.id, (tx) => [
      tx`select * from public.mark_payout_executed(${payoutId}, ${result.providerPayoutId}, ${result.status})`,
    ]);
    await notifyPayoutStatus(approved.campaign_id, result.status);
    return NextResponse.json({ data: updated });
  } catch (error) {
    await withUserContext(session.user.id, (tx) => [tx`select public.mark_payout_failed(${payoutId})`]);
    await notifyPayoutStatus(approved.campaign_id, "failed");
    return NextResponse.json({ error: { code: "PROVIDER_ERROR", message: error instanceof Error ? error.message : "Payout could not be sent." } }, { status: 502 });
  }
});

async function notifyPayoutStatus(campaignId: string, status: string) {
  const [campaign] = await sql`select owner_id, organization_id, title from public.campaigns where id = ${campaignId}`;
  if (!campaign) return;
  await notify(campaign.owner_id as string, campaign.organization_id as string | null, "payout_status", { campaignTitle: campaign.title, status });
}
