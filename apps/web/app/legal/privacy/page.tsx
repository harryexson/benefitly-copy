import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="page legal-page">
        <p className="kicker">Compliance</p>
        <h1>Privacy Policy</h1>
        <p className="lede">
          This policy explains what information Benefitly collects, why, and what we do &mdash; and don&apos;t do
          &mdash; with it. It is a working draft pending final legal review.
        </p>

        <section className="section legal-section">
          <h2>Information we collect</h2>
          <ul>
            <li>Account information: name, email, and authentication details when you sign up</li>
            <li>Organization information: legal entity name, EIN, and documentation submitted during business verification</li>
            <li>Membership records: contact details, dues, and benefit claim information entered by an organization</li>
            <li>Campaign content: text, photos, and video an organizer chooses to publish</li>
            <li>Usage data: device, browser, and interaction data collected to keep the platform reliable and secure</li>
          </ul>
          <p className="muted">
            We do not collect or store full payment card numbers or bank account numbers &mdash; that information is
            handled directly by our regulated payment providers.
          </p>
        </section>

        <section className="section legal-section">
          <h2>How we use it</h2>
          <ul>
            <li>To operate the membership, benefit, and campaign workflows you use Benefitly for</li>
            <li>To verify organizations and screen for prohibited use, consistent with our AML &amp; compliance program</li>
            <li>To send notifications you&apos;ve opted into (claim decisions, event reminders, donation activity)</li>
            <li>To detect fraud and enforce our Acceptable Use Policy</li>
            <li>To improve the reliability and security of the platform</li>
          </ul>
        </section>

        <section className="section legal-section">
          <h2>Who we share it with</h2>
          <p>We do not sell user data. We share information only as needed to:</p>
          <ul>
            <li>Process payments and disbursements, with our regulated payment providers (Stripe, Tremendous)</li>
            <li>Comply with a legal obligation, subpoena, or lawful request from a regulator or law enforcement</li>
            <li>Operate infrastructure providers (hosting, database, email/push delivery) bound by their own data protection obligations</li>
            <li>Within an organization, to the extent its own staff&apos;s permissions grant access to member or claim records</li>
          </ul>
        </section>

        <section className="section legal-section">
          <h2>Data retention</h2>
          <p>
            We retain account, membership, and transaction-adjacent records for as long as your account is active and
            for the period required afterward by applicable law and our payment partners&apos; own recordkeeping
            obligations.
          </p>
        </section>

        <section className="section legal-section">
          <h2>Your rights</h2>
          <ul>
            <li>Access and correct your account information at any time</li>
            <li>Request deletion of your data, subject to records we&apos;re legally required to retain</li>
            <li>Opt out of non-essential notifications</li>
          </ul>
          <p>
            Requests can be made through{" "}
            <Link className="text-link" href="/resources/contact">
              Contact Us
            </Link>
            .
          </p>
        </section>

        <section className="section legal-section">
          <h2>Security</h2>
          <p>
            Data is encrypted in transit and at rest, access is role-based and scoped per organization, and platform
            administrative access is limited and audited. See{" "}
            <Link className="text-link" href="/product/security">
              Security
            </Link>{" "}
            for details.
          </p>
        </section>

        <section className="section legal-section" style={{ paddingBottom: 56 }}>
          <h2>Changes to this policy</h2>
          <p className="muted">
            We&apos;ll update this page as our practices or legal obligations change, and note the effective date once
            this draft is finalized by counsel.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
