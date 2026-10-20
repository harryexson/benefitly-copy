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
          , every donation, dues payment, and payout on Benefitly is processed by Stripe, our regulated payment
          partner. Benefitly is the administrative layer on top &mdash; Stripe never holds or releases funds outside
          of a transaction initiated on Benefitly&apos;s own built-in donation, dues, and checkout forms. Organizers
          don&apos;t bring or link an external Stripe account; every payout destination is onboarded through
          Benefitly&apos;s own embedded Stripe Connect flow.
        </p>

        <section className="section legal-section">
          <h2>Payment provider</h2>
          <div className="compliance-grid">
            <div>
              <h3>Stripe</h3>
              <ul>
                <li>Identity verification (KYC/KYB) for organizers and organizations</li>
                <li>Credit &amp; debit card, Apple Pay, Google Pay, and ACH/EFT bank-transfer processing</li>
                <li>Donation, dues, ticket, and membership processing and settlement</li>
                <li>Payout delivery to verified bank accounts</li>
              </ul>
            </div>
            <div>
              <h3>Built-in checkout, not a linked account</h3>
              <ul>
                <li>Every transaction runs through Benefitly&apos;s own embedded checkout forms</li>
                <li>Organizers never connect a pre-existing external Stripe account</li>
                <li>Stripe Connect onboarding happens inside Benefitly, start to finish</li>
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
