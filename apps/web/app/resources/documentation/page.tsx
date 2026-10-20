import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "Documentation" };

export default function DocumentationPage() {
  return (
    <>
      <SiteHeader />
      <main className="page legal-page">
        <p className="kicker">Resources</p>
        <h1>Documentation</h1>
        <p className="lede">Guides for getting your association set up and running on Benefitly.</p>

        <section className="section legal-section">
          <h2>Getting started</h2>
          <ol>
            <li>Create an account and sign in.</li>
            <li>
              Go to{" "}
              <Link className="text-link" href="/organizations">
                For organizations
              </Link>{" "}
              and create your organization.
            </li>
            <li>Complete business verification (legal entity, EIN, intended use) before activating.</li>
            <li>Connect a payment provider for disbursements.</li>
            <li>Add members, set up your first benefit program, and you&apos;re ready to go.</li>
          </ol>
        </section>

        <section className="section legal-section">
          <h2>Member management</h2>
          <p>
            Add members individually with a member number, tier, and contact details. Track dues and one-off
            contributions against each member&apos;s record from their profile.
          </p>
        </section>

        <section className="section legal-section">
          <h2>Benefit programs &amp; claims</h2>
          <p>
            Create a benefit program with an eligibility description, a payout cap, and a claim review window. Members
            submit claims against the program; an organization admin approves or denies each claim with a documented
            reason.
          </p>
        </section>

        <section className="section legal-section">
          <h2>Events</h2>
          <p>Create an event with a start and end time, location, and optional capacity limit. Members register directly; registrations are tracked per event.</p>
        </section>

        <section className="section legal-section">
          <h2>Campaigns</h2>
          <p>
            Organizations can launch fundraising campaigns tied to their account. Every campaign goes through
            moderation review before it can accept public donations &mdash; see{" "}
            <Link className="text-link" href="/legal/acceptable-use">
              Acceptable Use Policy
            </Link>
            .
          </p>
        </section>

        <section className="section legal-section" style={{ paddingBottom: 56 }}>
          <h2>Need more detail?</h2>
          <p className="muted">
            The full{" "}
            <Link className="text-link" href="/resources/api-reference">
              API Reference
            </Link>{" "}
            documents every current route, or reach us through{" "}
            <Link className="text-link" href="/resources/support">
              Support Center
            </Link>
            .
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
