import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { GivingPlanManager } from "@/components/giving-plan-manager";
import { SavedCampaignsList } from "@/components/saved-campaigns-list";
import { myDonations, myGivingSummary, myGivingPlans, mySavedCampaigns } from "@/lib/donor";
import { listPublishedCampaigns } from "@/lib/campaigns";
import { requireSession } from "@/lib/session";
import type { CampaignSummary } from "@benefitly/domain";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your giving account" };

export default async function AccountPage() {
  const session = await requireSession();
  if (!session) {
    return (
      <>
        <SiteHeader />
        <main className="page">
          <h1>Sign in required</h1>
          <p>
            <Link href="/sign-in">Sign in</Link> to view your giving account.
          </p>
        </main>
      </>
    );
  }

  let unavailable = false;
  let donations: Awaited<ReturnType<typeof myDonations>> = [];
  let summary: Awaited<ReturnType<typeof myGivingSummary>> | null = null;
  let plans: Awaited<ReturnType<typeof myGivingPlans>> = [];
  let saved: Awaited<ReturnType<typeof mySavedCampaigns>> = [];
  let campaigns: CampaignSummary[] = [];
  try {
    const [donationRows, summaryRow, planRows, savedRows, campaignRows] = await Promise.all([
      myDonations(session.user.id),
      myGivingSummary(session.user.id),
      myGivingPlans(session.user.id),
      mySavedCampaigns(session.user.id),
      listPublishedCampaigns({}),
    ]);
    donations = donationRows;
    summary = summaryRow;
    plans = planRows;
    saved = savedRows;
    campaigns = campaignRows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      organizer: row.organizer,
      location: row.location ?? undefined,
      category: row.category,
      raised: { amount: row.raised_amount, currency: row.currency },
      goal: { amount: row.goal_amount, currency: row.currency },
      supporterCount: row.supporter_count,
      image: row.image ?? "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=85",
      status: row.status,
    }));
  } catch {
    unavailable = true;
  }

  const savedCampaigns = campaigns.filter((c) => saved.some((s) => s.campaign_id === c.id));

  return (
    <>
      <SiteHeader />
      <main className="page">
        <p className="kicker">Your giving account</p>
        <h1>Welcome back, {session.user.name || session.user.email}.</h1>

        {unavailable && <p className="muted">Your account can&apos;t be loaded right now. Please try again shortly.</p>}

        {!unavailable && summary && (
          <section className="section" style={{ padding: "24px 0" }}>
            <div className="stat-row">
              <div className="stat-tile">
                <p className="stat-value">${(summary.total_given_cents / 100).toLocaleString()}</p>
                <p className="muted">Total given</p>
              </div>
              <div className="stat-tile">
                <p className="stat-value">${(summary.ytd_given_cents / 100).toLocaleString()}</p>
                <p className="muted">Given this year</p>
              </div>
              <div className="stat-tile">
                <p className="stat-value">{summary.campaigns_supported}</p>
                <p className="muted">Fundraisers supported</p>
              </div>
              <div className="stat-tile">
                <p className="stat-value">{summary.donation_count}</p>
                <p className="muted">Donations made</p>
              </div>
            </div>
          </section>
        )}

        {!unavailable && (
          <>
            <section className="section" style={{ padding: "24px 0" }}>
              <h2>Giving plan</h2>
              <p className="muted">A recurring commitment you set for yourself &mdash; Benefitly reminds you, you stay in control of each gift.</p>
              <GivingPlanManager plans={plans} campaigns={campaigns} />
            </section>

            <section className="section" style={{ padding: "24px 0" }}>
              <h2>Saved fundraisers</h2>
              <SavedCampaignsList campaigns={savedCampaigns} />
            </section>

            <section className="section" style={{ padding: "24px 0 56px" }}>
              <h2>Donation history</h2>
              {donations.length === 0 && <p className="muted">You haven&apos;t made a donation yet.</p>}
              {donations.length > 0 && (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Fundraiser</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donations.map((d) => (
                      <tr key={d.id}>
                        <td>
                          <Link href={`/f/${d.campaign_slug}`}>{d.campaign_title}</Link>
                        </td>
                        <td>
                          ${(d.gross_amount / 100).toLocaleString()} {d.currency}
                        </td>
                        <td>{d.status}</td>
                        <td>{new Date(d.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
