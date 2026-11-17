import { NextRequest, NextResponse } from "next/server";
import { purchaseTicketsSchema } from "@benefitly/validation";
import { computeDonationSplit, DEFAULT_SUGGESTED_RATE } from "@benefitly/payments";
import type { PaymentProvider } from "@benefitly/domain";
import { sql, withUserContext } from "@/lib/database";
import { paymentProviderRouter } from "@/lib/payments";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";
import { rateLimited } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * A ticket purchase is a donation (same create_pending_donation/Stripe PaymentIntent pipeline as
 * /api/donations) with reserve_tickets minting the ticket rows up front, before the charge is even
 * confirmed -- exactly how the donation itself exists as 'pending' before settlement. Confirmation
 * email/SMS are sent from the Stripe webhook once the donation actually settles (lib/webhook-
 * processing.ts), never from here, so a ticket is never "confirmed" before payment really clears.
 */
export const POST = withRouteErrorHandling(async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; eventId: string }> }) {
  const { id: campaignId, eventId } = await params;
  const limited = await rateLimited(request, "ticket-purchase", 20, 600);
  if (limited) return limited;
  const body = await request.json().catch(() => null);
  const parsed = purchaseTicketsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_BODY", message: parsed.error.message } }, { status: 400 });
  const input = parsed.data;

  const [ticketType] = await sql`select * from public.list_event_ticket_types(${eventId})`.then((rows) => rows.filter((r) => r.id === input.ticketTypeId));
  if (!ticketType) return NextResponse.json({ error: { code: "TICKET_TYPE_NOT_FOUND", message: "This ticket type is not available." } }, { status: 404 });

  const [destination] = await sql`select * from public.campaign_donation_destination(${campaignId})`;
  if (!destination) return NextResponse.json({ error: { code: "CAMPAIGN_NOT_PAYABLE", message: "This fundraiser cannot sell tickets yet." } }, { status: 409 });
  const provider = destination.provider as PaymentProvider;
  if (!paymentProviderRouter.isConfigured(provider)) {
    return NextResponse.json({ error: { code: "PROVIDER_UNAVAILABLE", message: `${provider} is not configured on this server.` } }, { status: 503 });
  }

  // The donor's optional tip is offered on every paid ticket, whatever the organization's plan.
  const platformContribution = input.platformContribution;
  const ticketAmount = (ticketType.price_cents as number) * input.quantity;
  const split = ticketAmount > 0
    ? computeDonationSplit({ donationAmount: ticketAmount, platformContribution, currency: ticketType.currency as string })
    : { grossCharge: platformContribution, netToCampaign: 0, platformContribution, currency: ticketType.currency as string };

  const session = await requireSession();

  let donationId: string;
  let clientSecret: string | undefined;
  if (split.grossCharge > 0) {
    const charge = await paymentProviderRouter.for(provider).createDonationCharge({
      destinationAccountId: destination.provider_account_id,
      grossAmount: split.grossCharge,
      platformContribution: split.platformContribution,
      currency: split.currency,
      idempotencyKey: input.idempotencyKey,
      campaignId,
      donorEmail: input.attendeeEmail,
      statementDescriptor: "BENEFITLY",
    });
    clientSecret = charge.clientSecret;
    const [donation] = await sql`
      select * from public.create_pending_donation(
        ${campaignId}, ${session?.user.id ?? null}, ${split.grossCharge}, ${split.platformContribution},
        ${split.currency}, ${input.idempotencyKey}, ${charge.providerPaymentId}, ${DEFAULT_SUGGESTED_RATE}
      )
    `;
    donationId = donation.id as string;
    await sql`select public.attach_donation_provider_account(${charge.providerPaymentId}, ${destination.provider_account_id})`;
  } else {
    // A free ticket type (price_cents = 0, no tip added): still goes through create_pending_donation
    // for a consistent record, then settles immediately since no payment provider is involved.
    const [donation] = await sql`
      select * from public.create_pending_donation(${campaignId}, ${session?.user.id ?? null}, 0, 0, ${split.currency}, ${input.idempotencyKey}, ${`free_${input.idempotencyKey}`}, 0)
    `;
    await sql`select public.settle_donation(${`free_${input.idempotencyKey}`}, 0)`;
    donationId = donation.id as string;
  }

  try {
    const reserved = session
      ? await withUserContext(session.user.id, (tx) => [
          tx`select * from public.reserve_tickets(${donationId}, ${input.ticketTypeId}, ${input.quantity}, ${input.attendeeName}, ${input.attendeeEmail}, ${input.attendeePhone ?? null})`,
        ]).then(([rows]) => rows)
      : await sql`select * from public.reserve_tickets(${donationId}, ${input.ticketTypeId}, ${input.quantity}, ${input.attendeeName}, ${input.attendeeEmail}, ${input.attendeePhone ?? null})`;

    return NextResponse.json(
      {
        data: {
          donationId,
          ticketCount: reserved.length,
          clientSecret,
          stripeAccountId: destination.provider_account_id,
          grossCharge: split.grossCharge,
          currency: split.currency,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not reserve tickets";
    return NextResponse.json({ error: { code: "RESERVATION_FAILED", message } }, { status: 409 });
  }
});
