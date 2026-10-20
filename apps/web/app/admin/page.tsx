import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { platformStats } from "@/lib/admin";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Platform back office" };

export default async function AdminHomePage() {
  const session = await requireSession();
  if (!session) {
    return (
      <>
        <SiteHeader />
        <main className="page">
          <h1>Sign in required</h1>
          <p>
            <Link href="/sign-in">Sign in</Link> with a platform-admin account to view the back office.
          </p>
        </main>
      </>
    );
  }

  const stats = await platformStats(session.user.id).catch(() => null);

  return (
    <>
      <SiteHeader />
      <main className="page">
        <p className="kicker">Platform back office</p>
        <h1>Operations overview</h1>

        {!stats && <p className="muted">This page requires a platform-admin account, or the database is unreachable.</p>}

        {stats && (
          <>
            <div className="stat-row">
              <div className="stat-tile">
                <p className="stat-value">${(stats.total_raised_cents / 100).toLocaleString()}</p>
                <p className="muted">Total raised, platform-wide</p>
              </div>
              <div className="stat-tile">
                <p className="stat-value">{stats.total_donors}</p>
                <p className="muted">Unique donors</p>
              </div>
              <div className="stat-tile">
                <p className="stat-value">{stats.total_organizations}</p>
                <p className="muted">Organizations</p>
              </div>
              <div className="stat-tile">
                <p className="stat-value">
                  {stats.published_campaigns} / {stats.total_campaigns}
                </p>
                <p className="muted">Published fundraisers</p>
              </div>
            </div>

            <section className="section" style={{ padding: "24px 0" }}>
              <h2>Needs attention</h2>
              <div className="admin-nav-grid">
                <Link className="admin-nav-card" href="/admin/moderation">
                  <strong>{stats.pending_reviews}</strong>
                  <span>Pending campaign reviews</span>
                </Link>
                <Link className="admin-nav-card" href="/admin/moderation">
                  <strong>{stats.open_reports}</strong>
                  <span>Open reports</span>
                </Link>
                <Link className="admin-nav-card" href="/admin/moderation">
                  <strong>{stats.pending_payouts}</strong>
                  <span>Pending payouts</span>
                </Link>
              </div>
            </section>

            <section className="section" style={{ padding: "24px 0 56px" }}>
              <h2>Tools</h2>
              <div className="admin-nav-grid">
                <Link className="admin-nav-card" href="/admin/moderation">
                  <strong>Moderation queue</strong>
                  <span>Review campaigns, reports &amp; payouts</span>
                </Link>
                <Link className="admin-nav-card" href="/admin/organizations">
                  <strong>Organizations</strong>
                  <span>Plans, member counts &amp; totals raised</span>
                </Link>
                <Link className="admin-nav-card" href="/admin/audit-log">
                  <strong>Audit log</strong>
                  <span>Every recorded action, platform-wide</span>
                </Link>
                <Link className="admin-nav-card" href="/admin/webhooks">
                  <strong>Webhook events</strong>
                  <span>Inbound Stripe &amp; Adyen delivery log</span>
                </Link>
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}
