import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { DonorFilterForm } from "@/components/donor-filter-form";
import { getOrganizationBySlug, listOrganizationDonors, organizationCampaignOptions } from "@/lib/associations";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Donors" };

export default async function OrganizationDonorsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string; to?: string; min?: string; campaign?: string }>;
}) {
  const { slug } = await params;
  const session = await requireSession();
  if (!session) {
    return (
      <>
        <SiteHeader />
        <main className="page">
          <h1>Sign in required</h1>
          <p>
            <Link href="/sign-in">Sign in</Link> to view this organization&apos;s donors.
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
          <p className="muted">Viewing donors requires the finance.manage permission on this organization.</p>
        </main>
      </>
    );
  }

  const query = await searchParams;
  const filters = {
    fromDate: query.from || undefined,
    // A plain "YYYY-MM-DD" cast to timestamptz lands at midnight, which would exclude the rest
    // of that day -- push it to the end of the day so "to 2026-09-30" includes all of the 30th.
    toDate: query.to ? `${query.to}T23:59:59.999` : undefined,
    minAmountCents: query.min ? Math.round(Number(query.min) * 100) : undefined,
    campaignId: query.campaign || undefined,
  };

  let donors: Awaited<ReturnType<typeof listOrganizationDonors>> = [];
  let campaigns: Awaited<ReturnType<typeof organizationCampaignOptions>> = [];
  let unavailable = false;
  try {
    [donors, campaigns] = await Promise.all([
      listOrganizationDonors(session.user.id, org.id, filters),
      organizationCampaignOptions(session.user.id, org.id),
    ]);
  } catch {
    unavailable = true;
  }

  const totalGiven = donors.reduce((sum, d) => sum + d.total_given, 0);

  return (
    <>
      <SiteHeader />
      <main className="page">
        <p className="kicker">
          <Link href={`/org/${slug}`}>{org.name}</Link>
        </p>
        <h1>Donors ({donors.length})</h1>
        <p className="muted">
          Built automatically from every succeeded donation to this organization&apos;s campaigns. Bookmark a
          filtered view to keep it as a saved, always-current list.
        </p>

        <DonorFilterForm campaigns={campaigns} initial={{ from: query.from, to: query.to, min: query.min, campaign: query.campaign }} />

        {unavailable && <p className="muted">Donor data can&apos;t be loaded right now. Please try again shortly.</p>}

        {!unavailable && (
          <>
            <p className="amount" style={{ marginTop: 8 }}>
              <strong>${(totalGiven / 100).toLocaleString()}</strong> total from this list
            </p>
            {donors.length === 0 && <p className="muted">No donors match this filter yet.</p>}
            {donors.length > 0 && (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Donor</th>
                    <th>Gifts</th>
                    <th>Total given</th>
                    <th>First gift</th>
                    <th>Last gift</th>
                  </tr>
                </thead>
                <tbody>
                  {donors.map((donor) => (
                    <tr key={donor.donor_id}>
                      <td>
                        <Link href={`/org/${slug}/donors/${donor.donor_id}`}>{donor.donor_name}</Link>
                      </td>
                      <td>{donor.donation_count}</td>
                      <td>
                        ${(donor.total_given / 100).toLocaleString()} {donor.currency}
                      </td>
                      <td>{new Date(donor.first_gift_at).toLocaleDateString()}</td>
                      <td>{new Date(donor.last_gift_at).toLocaleDateString()}</td>
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
