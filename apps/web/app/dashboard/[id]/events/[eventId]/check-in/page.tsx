import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { ManualCheckInForm } from "@/components/manual-check-in-form";
import { getOwnedCampaignById } from "@/lib/organizer";
import { getCampaignEvent, organizerListEventTickets } from "@/lib/tickets";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Check in" };

export default async function EventCheckInPage({ params }: { params: Promise<{ id: string; eventId: string }> }) {
  const { id, eventId } = await params;
  const session = await requireSession();
  if (!session) {
    return (
      <>
        <SiteHeader />
        <main className="page">
          <h1>Sign in required</h1>
          <p>
            <Link href="/sign-in">Sign in</Link> to check in attendees.
          </p>
        </main>
      </>
    );
  }

  const campaign = await getOwnedCampaignById(session.user.id, id).catch(() => null);
  if (!campaign) notFound();

  const event = await getCampaignEvent(eventId).catch(() => null);
  if (!event || event.campaign_id !== campaign.id) notFound();

  const tickets = await organizerListEventTickets(session.user.id, eventId).catch(() => []);
  const checkedInCount = tickets.filter((t) => t.status === "checked_in").length;

  return (
    <>
      <SiteHeader />
      <main className="page">
        <p className="kicker">
          <Link href={`/dashboard/${campaign.id}`}>{campaign.title}</Link>
        </p>
        <h1>{event.title} — check-in</h1>
        <p className="muted">
          {checkedInCount} of {tickets.length} checked in. Attendees can also self check-in by scanning their ticket&apos;s
          QR code, or entering their code at <Link href="/checkin">benefitly-web.vercel.app/checkin</Link>.
        </p>

        <ManualCheckInForm campaignId={campaign.id} eventId={eventId} />

        <table className="admin-table">
          <thead>
            <tr>
              <th>Attendee</th>
              <th>Email</th>
              <th>Code</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id}>
                <td>{ticket.attendee_name}</td>
                <td>{ticket.attendee_email}</td>
                <td style={{ fontFamily: "monospace" }}>{ticket.code}</td>
                <td>{ticket.status === "checked_in" ? `Checked in ${new Date(ticket.checked_in_at!).toLocaleTimeString()}` : ticket.status}</td>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">
                  No tickets sold yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </main>
    </>
  );
}
