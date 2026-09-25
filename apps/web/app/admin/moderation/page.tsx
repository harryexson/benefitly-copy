import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { ModerationActions } from "@/components/moderation-actions";
import { PayoutApproveButton } from "@/components/payout-approve-button";
import { listPendingReviews, listOpenReports, listPendingPayouts } from "@/lib/admin";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Moderation queue" };

export default async function ModerationPage() {
  const session = await requireSession();
  if (!session) {
    return (
      <>
        <SiteHeader />
        <main className="page">
          <h1>Sign in required</h1>
          <p>
            <Link href="/sign-in">Sign in</Link> with a platform-admin account to view the moderation queue.
          </p>
        </main>
      </>
    );
  }

  let reviews: Awaited<ReturnType<typeof listPendingReviews>> = [];
  let reports: Awaited<ReturnType<typeof listOpenReports>> = [];
  let payouts: Awaited<ReturnType<typeof listPendingPayouts>> = [];
  let forbidden = false;
  try {
    [reviews, reports, payouts] = await Promise.all([listPendingReviews(session.user.id), listOpenReports(session.user.id), listPendingPayouts(session.user.id)]);
  } catch {
    forbidden = true;
  }

  return (
    <>
      <SiteHeader />
      <main className="page">
        <p className="kicker">Trust &amp; safety</p>
        <h1>Moderation queue</h1>
        {forbidden && <p className="muted">This page requires a platform-admin account, or the database is unreachable.</p>}

        {!forbidden && (
          <>
            <section className="section" style={{ padding: "24px 0" }}>
              <h2>Pending payouts ({payouts.length})</h2>
              {payouts.length === 0 && <p className="muted">Nothing waiting on a payout decision.</p>}
              {payouts.map((payout) => (
                <article className="campaign-card" key={payout.id} style={{ padding: 16, marginBottom: 12 }}>
                  <div className="campaign-copy">
                    <h3>
                      <Link href={`/f/${payout.campaign_slug}`}>{payout.campaign_title}</Link>
                    </h3>
                    <p className="muted">
                      ${(payout.amount / 100).toLocaleString()} {payout.currency} via {payout.provider} · requested by {payout.requester_name ?? "Unknown"}
                    </p>
                    <PayoutApproveButton payoutId={payout.id} />
                  </div>
                </article>
              ))}
            </section>

            <section className="section" style={{ padding: "24px 0" }}>
              <h2>Pending campaign reviews ({reviews.length})</h2>
              {reviews.length === 0 && <p className="muted">Nothing waiting on review.</p>}
              {reviews.map((review) => (
                <article className="campaign-card" key={review.id} style={{ padding: 16, marginBottom: 12 }}>
                  <div className="campaign-copy">
                    <h3>
                      <Link href={`/f/${review.slug}`}>{review.title}</Link>
                    </h3>
                    <p className="muted">Submitted by {review.owner_name}</p>
                    <ModerationActions campaignId={review.campaign_id} actions={["approve", "reject", "request_changes"]} />
                  </div>
                </article>
              ))}
            </section>

            <section className="section" style={{ padding: "24px 0" }}>
              <h2>Open reports ({reports.length})</h2>
              {reports.length === 0 && <p className="muted">No open reports.</p>}
              {reports.map((report) => (
                <article className="campaign-card" key={report.id} style={{ padding: 16, marginBottom: 12 }}>
                  <div className="campaign-copy">
                    <h3>
                      <Link href={`/f/${report.slug}`}>{report.title}</Link>
                    </h3>
                    <p className="muted">
                      {report.reason}
                      {report.details ? ` — ${report.details}` : ""}
                    </p>
                    <ModerationActions campaignId={report.campaign_id} reportId={report.id} actions={["pause", "remove", "restore"]} />
                  </div>
                </article>
              ))}
            </section>
          </>
        )}
      </main>
    </>
  );
}
