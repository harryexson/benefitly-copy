import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { listWebhookEvents } from "@/lib/admin";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Webhook events — back office" };

export default async function AdminWebhooksPage() {
  const session = await requireSession();
  if (!session) {
    return (
      <>
        <SiteHeader />
        <main className="page">
          <h1>Sign in required</h1>
          <p>
            <Link href="/sign-in">Sign in</Link> with a platform-admin account to view webhook events.
          </p>
        </main>
      </>
    );
  }

  let events: Awaited<ReturnType<typeof listWebhookEvents>> = [];
  let forbidden = false;
  try {
    events = await listWebhookEvents(session.user.id, 200);
  } catch {
    forbidden = true;
  }

  return (
    <>
      <SiteHeader />
      <main className="page">
        <p className="kicker">Back office</p>
        <h1>Webhook events</h1>
        <p className="muted">
          <Link href="/admin">← Back office</Link>
        </p>
        <p className="muted">Most recent 200 inbound Stripe &amp; Adyen deliveries, stored before processing so nothing is lost on a crash.</p>
        {forbidden && <p className="muted">This page requires a platform-admin account, or the database is unreachable.</p>}

        {!forbidden && (
          <>
            {events.length === 0 && <p className="muted">No webhook deliveries recorded yet.</p>}
            {events.length > 0 && (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Received</th>
                    <th>Provider</th>
                    <th>Event type</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id}>
                      <td>{new Date(event.received_at).toLocaleString()}</td>
                      <td>{event.provider}</td>
                      <td>{event.event_type}</td>
                      <td>{event.processing_error ? `Error: ${event.processing_error}` : event.processed_at ? "Processed" : "Pending"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </main>
    </>
  );
}
