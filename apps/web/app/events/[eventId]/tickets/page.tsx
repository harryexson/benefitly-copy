import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { TicketPurchaseForm } from "@/components/ticket-purchase-form";
import { getCampaignEvent, listEventTicketTypes } from "@/lib/tickets";
import { getPublishedCampaignById } from "@/lib/campaigns";

export const dynamic = "force-dynamic";
export const metadata = { title: "Buy tickets" };

export default async function EventTicketsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const event = await getCampaignEvent(eventId).catch(() => null);
  if (!event) notFound();

  const [campaign, ticketTypes] = await Promise.all([
    getPublishedCampaignById(event.campaign_id).catch(() => null),
    listEventTicketTypes(eventId).catch(() => []),
  ]);
  if (!campaign) notFound();

  return (
    <>
      <SiteHeader />
      <main className="campaign-page">
        <section>
          <p className="category">{campaign.category}</p>
          <h1>{event.title}</h1>
          <p className="lede">In support of {campaign.title}</p>
          <p>
            <strong>{new Date(event.starts_at).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })}</strong>
          </p>
          {event.location && <p className="muted">{event.location}</p>}
          {event.description && <p style={{ whiteSpace: "pre-wrap", marginTop: 16 }}>{event.description}</p>}
        </section>
        <TicketPurchaseForm campaignId={campaign.id} eventId={eventId} ticketTypes={ticketTypes} />
      </main>
    </>
  );
}
