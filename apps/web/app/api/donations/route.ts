import { NextRequest, NextResponse } from "next/server";
import { donationIntentSchema } from "@benefitly/validation";
import { computeDonationSplit, DEFAULT_SUGGESTED_RATE } from "@benefitly/payments";
import type { PaymentProvider } from "@benefitly/domain";
import { sql } from "@/lib/database";
import { paymentProviderRouter } from "@/lib/payments";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export const POST = withRouteErrorHandling(async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = donationIntentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "INVALID_BODY", message: parsed.error.message } }, { status: 400 });
  }
  const input = parsed.data;

  const [destination] = await sql`select * from public.campaign_donation_destination(${input.campaignId})`;
  if (!destination) {
    return NextResponse.json({ error: { code: "CAMPAIGN_NOT_PAYABLE", message: "This campaign cannot accept donations yet." } }, { status: 409 });
  }
  const provider = destination.provider as PaymentProvider;
  if (!paymentProviderRouter.isConfigured(provider)) {
    return NextResponse.json({ error: { code: "PROVIDER_UNAVAILABLE", message: `${provider} is not configured on this server.` } }, { status: 503 });
  }

  const split = computeDonationSplit({ donationAmount: input.amount, platformContribution: input.platformContribution, currency: input.currency });

  // Guest checkout: donor identity is optional. When signed in, the donation is attributed to the profile.
  const session = await requireSession();

  const charge = await paymentProviderRouter.for(provider).createDonationCharge({
    destinationAccountId: destination.provider_account_id,
    grossAmount: split.grossCharge,
    platformContribution: split.platformContribution,
    currency: split.currency,
    idempotencyKey: input.idempotencyKey,
    campaignId: input.campaignId,
    donorEmail: input.donorEmail,
    statementDescriptor: "BENEFITLY",
  });

  const [donation] = await sql`
    select * from public.create_pending_donation(
      ${input.campaignId}, ${session?.user.id ?? null}, ${split.grossCharge}, ${split.platformContribution},
      ${split.currency}, ${input.idempotencyKey}, ${charge.providerPaymentId}, ${DEFAULT_SUGGESTED_RATE}
    )
  `;

  return NextResponse.json({
    data: {
      donationId: donation.id,
      provider,
      status: charge.status,
      clientSecret: charge.clientSecret,
      redirectUrl: charge.redirectUrl,
      grossCharge: split.grossCharge,
      netToCampaign: split.netToCampaign,
      platformContribution: split.platformContribution,
      currency: split.currency,
    },
  }, { status: 201 });
});
