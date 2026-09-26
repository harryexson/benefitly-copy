import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "Security" };

export default function SecurityPage() {
  return (
    <>
      <SiteHeader />
      <main className="page legal-page">
        <p className="kicker">Product</p>
        <h1>Security is a design constraint, not an afterthought.</h1>
        <p className="lede">
          Benefitly handles member, benefit, and financial-adjacent data for real associations. Our security model is
          built around limiting access by default and proving, not assuming, that it stays limited.
        </p>

        <section className="section legal-section">
          <h2>Data isolation between organizations</h2>
          <p>
            Every organization&apos;s data &mdash; members, dues, benefit claims, events, campaigns &mdash; is scoped
            with database-level row-level security, enforced against the running application role, not just in
            application code. A user only ever sees the organizations and records their permissions actually grant.
          </p>
        </section>

        <section className="section legal-section">
          <h2>Encryption</h2>
          <ul>
            <li>Data encrypted in transit (TLS) between clients, our servers, and our database and payment providers</li>
            <li>Data encrypted at rest in our managed database and storage infrastructure</li>
            <li>No card numbers or bank account numbers are ever stored on Benefitly&apos;s own infrastructure &mdash; that data lives only with our regulated payment providers</li>
          </ul>
        </section>

        <section className="section legal-section">
          <h2>Access controls</h2>
          <ul>
            <li>Role-based permissions at the organization level (owner, staff, member)</li>
            <li>Platform-level administrative access limited to a small, audited set of accounts</li>
            <li>Every security-definer database function performs its own authorization check before writing data</li>
          </ul>
        </section>

        <section className="section legal-section">
          <h2>Monitoring &amp; audit trails</h2>
          <ul>
            <li>Moderation actions, payout approvals, and benefit claim decisions are recorded with an actor and reason</li>
            <li>Fraud signals and campaign reports route to manual review before funds move</li>
            <li>Webhook events from payment providers are signature-verified before being trusted</li>
          </ul>
        </section>

        <section className="section legal-section" style={{ paddingBottom: 56 }}>
          <h2>Responsible disclosure</h2>
          <p>
            If you believe you&apos;ve found a security issue in Benefitly, please report it through{" "}
            <Link className="text-link" href="/resources/contact">
              Contact Us
            </Link>{" "}
            rather than filing a public issue. We investigate every credible report.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
