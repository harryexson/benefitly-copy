import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { withUserContext } from "@/lib/database";
import { requireSession } from "@/lib/session";
import { SupportTicketForm } from "./support-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Support" };

export default async function SupportPage() {
  const session = await requireSession();
  if (!session) redirect("/sign-in?redirect=/support");
  const [tickets] = await withUserContext(session.user.id, (tx) => [
    tx`select id, subject, status, resolution_note, created_at, updated_at from public.support_tickets order by created_at desc limit 100`,
  ]);
  const rows = tickets as unknown as { id: string; subject: string; status: string; resolution_note: string | null; created_at: string; updated_at: string }[];
  return (
    <>
      <SiteHeader />
      <main className="page">
        <p className="kicker">Help</p>
        <h1>Support</h1>
        <p className="muted">Tell us what went wrong. We reply by email, and you can follow the status here.</p>
        <SupportTicketForm />
        <section className="section" style={{ padding: "24px 0" }}>
          <h2>Your requests</h2>
          {rows.length === 0 && <p className="muted">You have not opened any requests.</p>}
          <ul>
            {rows.map((ticket) => (
              <li key={ticket.id}>
                <strong>{ticket.subject}</strong> · {ticket.status.replace("_", " ")} · opened {new Date(ticket.created_at).toLocaleDateString()}
                {ticket.resolution_note && <div className="muted">Resolution: {ticket.resolution_note}</div>}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
