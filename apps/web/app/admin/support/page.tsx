import { SiteHeader } from "@/components/site-header";
import { withUserContext } from "@/lib/database";
import { requireSession } from "@/lib/session";
import { SupportQueueRow } from "./queue-row";

export const dynamic = "force-dynamic";
export const metadata = { title: "Support queue" };

export default async function AdminSupportPage() {
  const session = await requireSession();
  if (!session) {
    return (
      <>
        <SiteHeader />
        <main className="page"><h1>Sign in required</h1></main>
      </>
    );
  }
  let tickets: { id: string; subject: string; body: string; status: string; resolution_note: string | null; created_at: string }[];
  try {
    const [rows] = await withUserContext(session.user.id, (tx) => [tx`select * from public.admin_list_support_tickets(200)`]);
    tickets = rows as unknown as typeof tickets;
  } catch {
    return (
      <>
        <SiteHeader />
        <main className="page"><h1>Support queue</h1><p className="muted">Platform admins only.</p></main>
      </>
    );
  }
  return (
    <>
      <SiteHeader />
      <main className="page">
        <p className="kicker">Back office</p>
        <h1>Support queue</h1>
        {tickets.length === 0 && <p className="muted">No requests.</p>}
        <ul style={{ listStyle: "none", padding: 0 }}>
          {tickets.map((ticket) => (
            <SupportQueueRow key={ticket.id} ticket={ticket} />
          ))}
        </ul>
      </main>
    </>
  );
}
