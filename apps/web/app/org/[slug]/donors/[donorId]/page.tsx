import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getOrganizationBySlug, donorHistoryInOrganization } from "@/lib/associations";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Donor history" };

export default async function OrganizationDonorDetailPage({ params }: { params: Promise<{ slug: string; donorId: string }> }) {
  const { slug, donorId } = await params;
  const session = await requireSession();
  if (!session) {
    return (
      <>
        <SiteHeader />
        <main className="page">
          <h1>Sign in required</h1>
          <p>
            <Link href="/sign-in">Sign in</Link> to view this donor.
          </p>
        </main>
      </>
    );
  }

  const org = await getOrganizationBySlug(session.user.id, slug).catch(() => null);
  if (!org) notFound();

  if (!org.permissions.includes("finance.manage")) {
    return (
      <>
        <SiteHeader />
        <main className="page">
          <h1>Not authorized</h1>
          <p className="muted">Viewing donor history requires the finance.manage permission on this organization.</p>
        </main>
      </>
    );
  }

  const gifts = await donorHistoryInOrganization(session.user.id, org.id, donorId).catch(() => []);
  if (gifts.length === 0) notFound();

  const total = gifts.reduce((sum, g) => sum + g.gross_amount, 0);

  return (
    <>
      <SiteHeader />
      <main className="page">
        <p className="kicker">
          <Link href={`/org/${slug}/donors`}>{org.name} donors</Link>
        </p>
        <h1>Donor history</h1>
        <p className="amount">
          <strong>${(total / 100).toLocaleString()}</strong> given across {gifts.length} gift{gifts.length === 1 ? "" : "s"}
        </p>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Fundraiser</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {gifts.map((gift) => (
              <tr key={gift.donation_id}>
                <td>{new Date(gift.created_at).toLocaleDateString()}</td>
                <td>
                  <Link href={`/f/${gift.campaign_slug}`}>{gift.campaign_title}</Link>
                </td>
                <td>
                  ${(gift.gross_amount / 100).toLocaleString()} {gift.currency}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </>
  );
}
