import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { OrganizerOnboarding } from "@/components/organizer-onboarding";
import { PayoutRequestButton } from "@/components/payout-request-button";
import { listOwnedCampaigns, getOwnPaymentAccount } from "@/lib/organizer";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your dashboard" };

const reviewLabels: Record<string, string> = {
  pending: "Waiting for review",
  approved: "Approved",
  rejected: "Not approved",
  changes_requested: "Changes requested",
};

export default async function DashboardPage() {
  const session = await requireSession();
  if (!session) {
    return (
      <>
        <SiteHeader />
        <main className="page">
          <h1>Sign in required</h1>
          <p>
            <Link href="/sign-in">Sign in</Link> to view your dashboard.
          </p>
        </main>
      </>
    );
  }

  let campaigns: Awaited<ReturnType<typeof listOwnedCampaigns>> = [];
  let paymentAccount: Awaited<ReturnType<typeof getOwnPaymentAccount>> = undefined;
  let unavailable = false;
  try {
    [campaigns, paymentAccount] = await Promise.all([listOwnedCampaigns(session.user.id), getOwnPaymentAccount(session.user.id)]);
  } catch {
    unavailable = true;
  }

  return (
    <>
      <SiteHeader />
      <main className="page">
        <p className="kicker">Your dashboard</p>
        <h1>Welcome back, {session.user.name || session.user.email}.</h1>
        <p>
          <Link className="button small" href="/start">
            Start a new fundraiser
          </Link>
        </p>

        {unavailable && <p className="muted">Your dashboard can&apos;t be loaded right now. Please try again shortly.</p>}

        {!unavailable && !paymentAccount && <OrganizerOnboarding />}
        {!unavailable && paymentAccount && (
          <p className="muted">
            Payout account: {paymentAccount.provider} ({paymentAccount.status})
          </p>
        )}

        {!unavailable && (
          <section className="section" style={{ padding: "40px 0" }}>
            <h2>Your campaigns</h2>
            {campaigns.length === 0 && <p className="muted">You haven&apos;t started a fundraiser yet.</p>}
            <div className="campaign-grid">
              {campaigns.map((campaign) => {
                const availableToPayOut = campaign.raised_amount;
                return (
                  <article className="campaign-card" key={campaign.id}>
                    <div className="campaign-copy">
                      <p className="category">
                        {campaign.status}
                        {campaign.review_status ? ` · ${reviewLabels[campaign.review_status] ?? campaign.review_status}` : ""}
                      </p>
                      <h3>
                        <Link href={`/f/${campaign.slug}`}>{campaign.title}</Link>
                      </h3>
                      <p>
                        <strong>${(campaign.raised_amount / 100).toLocaleString()}</strong> raised of ${(campaign.goal_amount / 100).toLocaleString()}
                      </p>
                      <p>
                        <Link href={`/dashboard/${campaign.id}`}>Manage photos, video &amp; updates</Link>
                      </p>
                      {campaign.status === "published" && paymentAccount?.status === "active" && (
                        <PayoutRequestButton
                          campaignId={campaign.id}
                          paymentAccountId={paymentAccount.id}
                          amount={availableToPayOut}
                          currency={campaign.currency}
                        />
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
