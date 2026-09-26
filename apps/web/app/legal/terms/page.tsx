import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="page legal-page">
        <p className="kicker">Compliance</p>
        <h1>Terms of Service</h1>
        <p className="lede">
          These terms govern use of Benefitly by organizations, members, organizers, and donors. This is a working
          draft pending final legal review, not a substitute for legal advice.
        </p>

        <section className="section legal-section">
          <h2>1. What Benefitly is</h2>
          <p>
            Benefitly is a software service provider offering administrative benefit management tools to mutual
            benefit associations, member-based organizations, faith-based membership communities, and professional
            associations. Benefitly is not a payment processor, remittance provider, money transmitter, financial
            institution, or bank. All financial transactions are processed through regulated third-party providers.
          </p>
        </section>

        <section className="section legal-section">
          <h2>2. Eligibility &amp; account registration</h2>
          <p>By creating an account or registering an organization, you represent that:</p>
          <ul>
            <li>You are legally registered as the entity type you claim, where applicable</li>
            <li>The information you provide during business verification is accurate and current</li>
            <li>You will not use the platform for restricted or prohibited activities</li>
            <li>All benefit distributions and campaign activity you initiate are legitimate and lawful</li>
            <li>You will comply with applicable regulations in your jurisdiction</li>
          </ul>
        </section>

        <section className="section legal-section">
          <h2>3. Acceptable use</h2>
          <p>
            Use of Benefitly is governed by our{" "}
            <Link className="text-link" href="/legal/acceptable-use">
              Acceptable Use Policy
            </Link>
            , including the list of strictly prohibited uses and prohibited industries. Violations result in
            immediate suspension and termination.
          </p>
        </section>

        <section className="section legal-section">
          <h2>4. Fees &amp; payments</h2>
          <p>
            Benefitly charges a platform subscription fee for administrative tools. Benefitly does not hold, pool, or
            store organization or member funds. Donation, dues, and disbursement processing is handled entirely by
            our regulated payment partners under their own terms, which apply in addition to these.
          </p>
        </section>

        <section className="section legal-section">
          <h2>5. Content &amp; campaigns</h2>
          <p>
            You retain ownership of content you publish (campaign stories, photos, updates), and grant Benefitly a
            license to host and display it on the platform. Campaigns are subject to review before publication and
            can be paused, reported, or removed for violating our Acceptable Use Policy.
          </p>
        </section>

        <section className="section legal-section">
          <h2>6. Suspension &amp; termination</h2>
          <p>
            Benefitly reserves the right to suspend or terminate accounts that violate compliance policies, at our
            discretion and, where legally required, without prior notice.
          </p>
        </section>

        <section className="section legal-section">
          <h2>7. Disclaimers &amp; limitation of liability</h2>
          <p>
            Benefitly provides administrative tools on an &quot;as is&quot; basis. Benefitly is not responsible for
            the accuracy of information organizers, organizations, or members submit, or for the acts of third-party
            payment providers. To the maximum extent permitted by law, Benefitly&apos;s liability is limited as
            described in the finalized agreement you enter into with us.
          </p>
        </section>

        <section className="section legal-section">
          <h2>8. Changes to these terms</h2>
          <p className="muted">We&apos;ll notify account holders of material changes before they take effect.</p>
        </section>

        <section className="section legal-section" style={{ paddingBottom: 56 }}>
          <p className="muted">
            Questions about these terms can be sent through{" "}
            <Link className="text-link" href="/resources/contact">
              Contact Us
            </Link>
            .
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
