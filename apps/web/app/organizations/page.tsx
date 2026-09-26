import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { CreateOrganizationForm } from "@/components/create-organization-form";
import { myOrganizations } from "@/lib/associations";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Association management" };

export default async function OrganizationsPage() {
  const session = await requireSession();
  const organizations = session ? await myOrganizations(session.user.id).catch(() => []) : [];

  return (
    <>
      <SiteHeader />
      <main className="page">
        <p className="kicker">For organizations</p>
        <h1>Run your association with the same care you bring to your people.</h1>
        <p className="lede">Manage members, dues, benefits, claims, events and community fundraising in a workspace built around accountable decisions.</p>

        {!session && (
          <p>
            <Link className="button" href="/sign-in">
              Sign in to get started
            </Link>
          </p>
        )}

        {session && (
          <>
            {organizations.length > 0 && (
              <section className="section" style={{ padding: "24px 0" }}>
                <h2>Your organizations</h2>
                <div className="campaign-grid">
                  {organizations.map((org) => (
                    <article className="campaign-card" key={org.id}>
                      <div className="campaign-copy">
                        <h3>
                          <Link href={`/org/${org.slug}`}>{org.name}</Link>
                        </h3>
                        <p className="muted">{org.permissions.length} permissions</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
            <section className="section" style={{ padding: "24px 0" }}>
              <h2>Create an organization</h2>
              <CreateOrganizationForm />
            </section>
          </>
        )}

        <section className="section legal-section" style={{ padding: "56px 0 24px" }}>
          <h2>What you get</h2>
          <div className="compliance-grid">
            <div>
              <h3>Membership &amp; dues</h3>
              <ul>
                <li>A member roster with searchable status, tiers, and contact details</li>
                <li>Dues and contribution tracking tied to each member&apos;s record</li>
                <li>Self-serve benefit programs your members can claim against</li>
              </ul>
            </div>
            <div>
              <h3>Claims &amp; events</h3>
              <ul>
                <li>Benefit claim submission and a documented approve/deny workflow</li>
                <li>Event creation with capacity limits and member registration</li>
                <li>Announcements to keep your members in the loop</li>
              </ul>
            </div>
            <div>
              <h3>Fundraising</h3>
              <ul>
                <li>Campaigns tied to your organization, with the same review every campaign goes through</li>
                <li>Payouts to your organization&apos;s verified payment account, not an individual&apos;s</li>
                <li>Full donation and payout history for your treasurer or board</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="section legal-section" style={{ padding: "24px 0" }}>
          <h2>Before you can activate</h2>
          <p>
            Benefitly is administrative technology for benefits management, not a payment processor or money
            transmitter &mdash; we verify every tenant organization before activation, then get out of the way of the
            money:
          </p>
          <ol>
            <li>
              <strong>Business verification.</strong> Legal entity verification, EIN confirmation, organizational
              documentation review, and a review of intended platform use.
            </li>
            <li>
              <strong>Connect a payment provider.</strong> Disbursements route through regulated third-party
              providers (Stripe, Tremendous) &mdash; Benefitly never holds, pools, or stores your organization&apos;s
              funds.
            </li>
            <li>
              <strong>Pass campaign and moderation review.</strong> Each campaign your organization publishes is
              reviewed before it can go live.
            </li>
          </ol>
        </section>

        <section className="section legal-section" style={{ padding: "24px 0 56px" }}>
          <h2>Regulatory compliance</h2>
          <p>
            Benefitly serves structured, verified organizations only &mdash; mutual benefit associations,
            member-based organizations, faith-based membership communities, and professional associations.
            Cryptocurrency, gambling, adult content, sweepstakes, high-risk financial services, and remittance or
            money-transfer businesses are never permitted on the platform.
          </p>
          <p>
            <Link className="button small" href="/legal/compliance">
              Read the full compliance &amp; acceptable use policy
            </Link>
          </p>
          <p className="muted">
            This summary and the linked policy are working drafts pending final legal review, and will be superseded
            by Benefitly&apos;s finalized Terms of Service.
          </p>
        </section>
      </main>
    </>
  );
}
