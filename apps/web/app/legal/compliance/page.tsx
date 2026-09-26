import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata = { title: "Compliance & acceptable use" };

export default function CompliancePage() {
  return (
    <>
      <SiteHeader />
      <main className="page legal-page">
        <p className="kicker">Administrative technology for benefits management</p>
        <h1>Benefitly is a compliance-forward platform, by design.</h1>
        <p className="lede">
          Benefitly is a multi-tenant SaaS platform that allows verified mutual benefit associations to manage and
          track member benefits through structured workflows. This page is our working compliance disclosure,
          reviewed and updated as the platform evolves &mdash; it does not replace legal advice.
        </p>

        <section className="section legal-section">
          <h2>What Benefitly does</h2>
          <div className="compliance-grid">
            <div>
              <h3>We do</h3>
              <ul>
                <li>Manage member benefits and entitlements</li>
                <li>Automate benefit allocation workflows</li>
                <li>Maintain structured approval processes</li>
                <li>Track benefit disbursement records</li>
                <li>Maintain audit-ready reporting</li>
              </ul>
            </div>
            <div>
              <h3>We do not</h3>
              <ul>
                <li>Hold consumer deposits</li>
                <li>Store end-user funds</li>
                <li>Facilitate peer-to-peer transfers</li>
                <li>Operate wallets</li>
                <li>Provide lending, credit, or financial tools</li>
              </ul>
            </div>
          </div>
          <p className="muted">All financial transactions are processed through regulated third-party providers.</p>
        </section>

        <section className="section legal-section">
          <h2>Industries we serve</h2>
          <p>Benefitly exclusively serves structured, verified organizations.</p>
          <div className="compliance-grid">
            <div>
              <h3>Who we serve</h3>
              <ul>
                <li>Mutual benefit associations</li>
                <li>Member-based organizations</li>
                <li>Structured associations</li>
                <li>Faith-based membership communities</li>
                <li>Professional associations</li>
              </ul>
            </div>
            <div>
              <h3>Prohibited industries</h3>
              <ul>
                <li>Cryptocurrency businesses</li>
                <li>Gambling platforms</li>
                <li>Adult content providers</li>
                <li>Sweepstakes operators</li>
                <li>High-risk financial services</li>
                <li>Remittance or money transfer businesses</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="section legal-section">
          <h2>Our compliance commitment</h2>
          <p className="muted">Built for regulatory alignment. Benefitly maintains strong compliance standards aligned with U.S. regulatory expectations.</p>

          <h3>1. Business verification</h3>
          <p>We conduct verification and due diligence on all tenant organizations before activation:</p>
          <ul>
            <li>Legal entity verification</li>
            <li>EIN confirmation</li>
            <li>Organizational documentation review</li>
            <li>Review of intended platform use</li>
          </ul>

          <h3>2. AML &amp; fraud prevention</h3>
          <p>Internal controls appropriate for a SaaS infrastructure provider:</p>
          <ul>
            <li>Tenant onboarding screening</li>
            <li>Prohibited industry filtering</li>
            <li>Transaction monitoring via partners</li>
            <li>Risk-based review processes</li>
            <li>Suspicious activity escalation</li>
            <li>Immediate policy violation suspension</li>
          </ul>

          <h3>3. No custody of funds</h3>
          <p>Benefitly does NOT:</p>
          <ul>
            <li>Hold customer funds</li>
            <li>Pool funds</li>
            <li>Maintain stored-value accounts</li>
            <li>Operate as a wallet</li>
          </ul>
          <p className="muted">
            Funds originate from verified organizations and are processed through third-party regulated payment
            providers.
          </p>
        </section>

        <section className="section legal-section">
          <h2>Risk &amp; regulatory statement</h2>
          <p>Benefitly operates exclusively as a software service provider.</p>
          <div className="compliance-grid">
            <div>
              <h3>We are NOT</h3>
              <ul>
                <li>A payment processor</li>
                <li>A remittance provider</li>
                <li>A money transmitter</li>
                <li>A financial institution</li>
                <li>A bank</li>
                <li>A gig marketplace</li>
              </ul>
            </div>
            <div>
              <h3>We provide</h3>
              <ul>
                <li>Administrative benefit management tools only</li>
                <li>Internal risk controls and compliance oversight</li>
                <li>Responsible platform usage monitoring</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="section legal-section">
          <h2>Enterprise-grade platform features</h2>
          <p className="muted">Built for compliance-forward organizations.</p>
          <div className="compliance-grid">
            <div>
              <h3>Secure member management</h3>
              <p className="muted">Role-based access controls, encrypted data storage, and audit-ready member tracking.</p>
            </div>
            <div>
              <h3>Transparent documentation</h3>
              <p className="muted">Complete audit trails, transaction records, and compliance-ready reporting infrastructure.</p>
            </div>
          </div>
          <div className="compliance-grid">
            <div>
              <h3>Third-party payment integration</h3>
              <p className="muted">Secure integrations with regulated payment providers (Stripe, Tremendous) for compliant disbursements.</p>
            </div>
          </div>
        </section>

        <section className="section legal-section">
          <h2>Acceptable use policy</h2>
          <p className="muted">Platform usage restrictions.</p>
          <p>Benefitly strictly prohibits use for:</p>
          <ul>
            <li>Cryptocurrency transactions</li>
            <li>Gambling or betting services</li>
            <li>Adult content distribution</li>
            <li>Sweepstakes or prize schemes</li>
            <li>High-risk financial instruments</li>
            <li>Money transmission or remittance services</li>
            <li>Unlicensed financial activity</li>
          </ul>
          <p>
            <strong>⚠ Violation of this policy results in immediate suspension and termination.</strong>
          </p>
        </section>

        <section className="section legal-section">
          <h2>Privacy &amp; data security</h2>
          <p className="muted">Your data is protected with industry-leading security practices.</p>
          <ul>
            <li>Collect only necessary administrative information</li>
            <li>Do not sell user data</li>
            <li>Encrypt data in transit and at rest</li>
            <li>Use role-based access controls</li>
            <li>Maintain secure cloud infrastructure</li>
            <li>Provide data deletion upon request</li>
          </ul>
        </section>

        <section className="section legal-section">
          <h2>Terms of service</h2>
          <p>By using Benefitly, organizations agree that:</p>
          <ul>
            <li>They are legally registered entities</li>
            <li>They will not use the platform for restricted activities</li>
            <li>All benefit distributions are legitimate and lawful</li>
            <li>They will comply with applicable regulations</li>
          </ul>
          <p className="muted">Benefitly reserves the right to suspend accounts that violate compliance policies.</p>
        </section>

        <section className="section legal-section">
          <h2>Enterprise ready</h2>
          <p className="lede">
            Benefitly is designed for structured associations that require transparent benefit administration,
            audit-ready documentation, secure entitlement tracking, and compliant third-party payment integrations.
          </p>
          <p className="muted">Regulatory alignment &middot; Partner compliance &middot; Risk mitigation &middot; Best practices</p>
          <p>
            <Link className="button" href="/organizations">
              Ready to get started &mdash; join verified mutual benefit associations
            </Link>
          </p>
        </section>
      </main>
    </>
  );
}
