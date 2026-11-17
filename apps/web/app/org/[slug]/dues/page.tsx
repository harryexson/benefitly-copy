import { notFound, redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getOrganizationBySlug } from "@/lib/associations";
import { withUserContext } from "@/lib/database";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dues" };

type Row = { member_id: string; member_number: string; member_name: string; membership_level: string | null; status: string; paid_current: boolean; last_paid_at: string | null };

export default async function OrganizationDuesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await requireSession();
  if (!session) redirect(`/sign-in?redirect=${encodeURIComponent(`/org/${slug}/dues`)}`);
  const org = await getOrganizationBySlug(session.user.id, slug).catch(() => null);
  if (!org) notFound();

  let rows: Row[] = [];
  let allowed = true;
  try {
    const [result] = await withUserContext(session.user.id, (tx) => [tx`select * from public.organization_dues_overview(${org.id})`]);
    rows = result as unknown as Row[];
  } catch {
    allowed = false;
  }

  const paid = rows.filter((row) => row.paid_current).length;
  return (
    <>
      <SiteHeader />
      <main className="page">
        <p className="kicker">{org.name}</p>
        <h1>Dues</h1>
        {!allowed ? (
          <p className="muted">Only organization managers with finance or membership permissions can see dues.</p>
        ) : (
          <>
            <p>
              {paid} of {rows.length} active members have paid dues in the past 12 months.{" "}
              <a href={`/api/organizations/${org.id}/reports/dues`}>Download the dues CSV</a>
            </p>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th align="left">Member #</th>
                  <th align="left">Name</th>
                  <th align="left">Level</th>
                  <th align="left">Dues</th>
                  <th align="left">Last paid</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.member_id}>
                    <td>{row.member_number}</td>
                    <td>{row.member_name}</td>
                    <td>{row.membership_level ?? "—"}</td>
                    <td>{row.paid_current ? "Paid" : "Due"}</td>
                    <td>{row.last_paid_at ? new Date(row.last_paid_at).toLocaleDateString() : "Never"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </main>
    </>
  );
}
