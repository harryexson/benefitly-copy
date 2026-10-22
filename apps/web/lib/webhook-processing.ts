import type { PaymentProvider, WebhookEvent } from "@benefitly/domain";
import { sql } from "@/lib/database";
import { notify } from "@/lib/notifications";
import { sendTicketConfirmationEmail } from "@/lib/email";
import { sendTicketConfirmationSms, isSmsConfigured } from "@/lib/sms";

/**
 * Records the event (idempotently) then applies its effect on the matching donation. Every
 * branch is a no-op on a second delivery: `ingest_webhook_event` returns false for a duplicate
 * (provider, event id), and `settle_donation`/`fail_donation` only transition a 'pending' row.
 */
async function applyOnce(provider: PaymentProvider, event: WebhookEvent, apply: () => Promise<void>) {
  const [isNew] = await sql`select public.ingest_webhook_event(${provider}, ${event.id}, ${event.type}, ${JSON.stringify(event.data)}::jsonb) as is_new`;
  if (!isNew?.is_new) return { duplicate: true };

  try {
    await apply();
    await sql`select public.mark_webhook_event_processed(${provider}, ${event.id})`;
    return { duplicate: false };
  } catch (error) {
    await sql`select public.mark_webhook_event_processed(${provider}, ${event.id}, ${error instanceof Error ? error.message : String(error)})`;
    throw error;
  }
}

export async function processProviderWebhook(provider: PaymentProvider, event: WebhookEvent, paymentIntentId: string, outcome: "succeeded" | "failed", processorFee = 0) {
  return applyOnce(provider, event, async () => {
    if (outcome === "succeeded") {
      const [donation] = await sql`select * from public.settle_donation(${paymentIntentId}, ${processorFee})`;
      if (donation?.id) {
        await notifyDonationReceived(donation.campaign_id as string, donation.net_campaign_amount as number);
        await sendTicketConfirmationsIfAny(donation.id as string);
      }
    } else {
      await sql`select public.fail_donation(${paymentIntentId})`;
    }
  });
}

/** Member dues are charged directly on the organization's account, so there is no donation row to settle. */
export async function processMemberDuesWebhook(provider: PaymentProvider, event: WebhookEvent, paymentIntentId: string, outcome: "succeeded" | "failed") {
  return applyOnce(provider, event, async () => {
    if (outcome === "succeeded") await sql`select public.settle_member_dues(${paymentIntentId})`;
    else await sql`select public.fail_member_dues(${paymentIntentId})`;
  });
}

/**
 * A settled donation may be a ticket order (apps/web/app/api/campaigns/[id]/events/[eventId]/
 * tickets/route.ts reserves the ticket rows before the charge even completes, same as the
 * donation itself starting 'pending'). Group by event since one order could in principle span
 * types for the same event, though today's purchase flow only ever buys one type at a time.
 */
async function sendTicketConfirmationsIfAny(donationId: string) {
  const tickets = await sql`select * from public.tickets_for_donation(${donationId})`;
  if (tickets.length === 0) return;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://benefitly-web.vercel.app";
  const first = tickets[0] as { attendee_name: string; attendee_email: string; attendee_phone: string | null; event_title: string; event_starts_at: string; event_location: string | null };
  const codes = tickets.map((t) => t.code as string);

  await sendTicketConfirmationEmail({
    to: first.attendee_email,
    attendeeName: first.attendee_name,
    eventTitle: first.event_title,
    eventStartsAt: first.event_starts_at,
    eventLocation: first.event_location,
    baseUrl,
    codes,
  }).catch((error) => console.error("Ticket confirmation email failed", error));

  if (first.attendee_phone && isSmsConfigured()) {
    await sendTicketConfirmationSms({ to: first.attendee_phone, eventTitle: first.event_title, eventStartsAt: first.event_starts_at, codes, baseUrl }).catch((error) =>
      console.error("Ticket confirmation SMS failed", error),
    );
  }
}

async function notifyDonationReceived(campaignId: string, amount: number) {
  const [campaign] = await sql`select owner_id, organization_id, title from public.campaigns where id = ${campaignId}`;
  if (!campaign) return;
  await notify(campaign.owner_id as string, campaign.organization_id as string | null, "donation_received", { amount, campaignTitle: campaign.title });
}

export async function processSubscriptionUpdate(event: WebhookEvent, update: { organizationId: string; tier: string; status: string; subscriptionId: string | null }) {
  return applyOnce("stripe_connect", event, async () => {
    await sql`select public.apply_organization_subscription(${update.organizationId}, ${update.tier}, ${update.status}, ${update.subscriptionId})`;
  });
}
