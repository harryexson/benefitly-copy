import type { PaymentProvider, WebhookEvent } from "@benefitly/domain";
import { sql } from "@/lib/database";
import { notify } from "@/lib/notifications";

/**
 * Records the event (idempotently) then applies its effect on the matching donation. Every
 * branch is a no-op on a second delivery: `ingest_webhook_event` returns false for a duplicate
 * (provider, event id), and `settle_donation`/`fail_donation` only transition a 'pending' row.
 */
export async function processProviderWebhook(provider: PaymentProvider, event: WebhookEvent, paymentIntentId: string, outcome: "succeeded" | "failed", processorFee = 0) {
  const [isNew] = await sql`select public.ingest_webhook_event(${provider}, ${event.id}, ${event.type}, ${JSON.stringify(event.data)}::jsonb) as is_new`;
  if (!isNew?.is_new) return { duplicate: true };

  try {
    if (outcome === "succeeded") {
      const [donation] = await sql`select * from public.settle_donation(${paymentIntentId}, ${processorFee})`;
      if (donation?.id) await notifyDonationReceived(donation.campaign_id as string, donation.net_campaign_amount as number);
    } else {
      await sql`select public.fail_donation(${paymentIntentId})`;
    }
    await sql`select public.mark_webhook_event_processed(${provider}, ${event.id})`;
    return { duplicate: false };
  } catch (error) {
    await sql`select public.mark_webhook_event_processed(${provider}, ${event.id}, ${error instanceof Error ? error.message : String(error)})`;
    throw error;
  }
}

async function notifyDonationReceived(campaignId: string, amount: number) {
  const [campaign] = await sql`select owner_id, organization_id, title from public.campaigns where id = ${campaignId}`;
  if (!campaign) return;
  await notify(campaign.owner_id as string, campaign.organization_id as string | null, "donation_received", { amount, campaignTitle: campaign.title });
}
