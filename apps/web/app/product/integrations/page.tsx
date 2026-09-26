import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "Integrations" };

export default function IntegrationsPage() {
  return (
    <>
      <SiteHeader />
      <main className="page legal-page">
        <p className="kicker">Product</p>
        <h1>Benefitly doesn&apos;t move money. Regulated partners do.</h1>
        <p className="lede">
          Consistent with our{" "}
          <Link className="text-link" href="/legal/compliance">
            no-custody-of-funds policy
          </Link>
          , every disbursement, payout, and donation on Benefitly is processed by a regulated third-party payment
          provider. Benefitly is the administrative layer on top.
        </p>

        <section className="section legal-section">
          <h2>Payment providers</h2>
          <div className="compliance-grid">
            <div>
              <h3>Stripe</h3>
              <ul>
                <li>Identity verification (KYC/KYB) for organizers and organizations</li>
                <li>Donation processing and settlement</li>
                <li>Payout delivery to verified bank accounts</li>
              </ul>
            </div>
            <div>
              <h3>Tremendous</h3>
              <ul>
                <li>Benefit disbursements and reimbursements to members</li>
                <li>Flexible payout methods (bank transfer, digital gift cards, check)</li>
                <li>Its own compliance and sanctions screening on every recipient</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="section legal-section">
          <h2>Notifications</h2>
          <p>Push notifications for donation activity, benefit claim decisions, and event reminders, delivered to the Benefitly mobile app.</p>
        </section>

        <section className="section legal-section" style={{ paddingBottom: 56 }}>
          <h2>What&apos;s next</h2>
          <p className="muted">
            Accounting exports (QuickBooks, Xero) and calendar sync are on our roadmap. If your association needs a
            specific integration, let us know through Contact Us.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
