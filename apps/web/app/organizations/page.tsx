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
          <h2>Before you can accept donations</h2>
          <p>
            Every organization goes through the same onboarding as an individual organizer, because the money moves
            through the same regulated payment infrastructure:
          </p>
          <ol>
            <li>
              <strong>Verify your organization (KYB).</strong> Registration documents, an EIN or equivalent tax ID, and
              identity verification for the person(s) who control the account.
            </li>
            <li>
              <strong>Connect a payment account.</strong> Payouts go to a verified business bank account tied to your
              organization, never to a personal account, so funds always trace back to the entity that owns them.
            </li>
            <li>
              <strong>Pass campaign and moderation review.</strong> Each campaign your organization publishes is
              reviewed before it can accept public donations, the same as any individual campaign.
            </li>
          </ol>
        </section>

        <section className="section legal-section" style={{ padding: "24px 0 56px" }}>
          <h2>Regulatory compliance</h2>
          <p>
            Benefitly runs an AML/CFT program, sanctions screening, and campaign moderation on every organization and
            campaign, and maintains a clear list of prohibited uses and prohibited industries that no organization on
            the platform may operate in.
          </p>
          <p>
            <Link className="button small" href="/legal/compliance">
              Read the full compliance &amp; acceptable use policy
            </Link>
          </p>
          <p className="muted">
            This summary and the linked policy are working drafts pending final legal review, and will be superseded
            by Benefitly&apos;s finalized Terms of Service before any organization can accept live donations.
          </p>
        </section>
      </main>
    </>
  );
}
