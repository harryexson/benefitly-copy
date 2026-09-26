import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata = { title: "Compliance & acceptable use" };

export default function CompliancePage() {
  return (
    <>
      <SiteHeader />
      <main className="page legal-page">
        <p className="kicker">Trust &amp; compliance</p>
        <h1>How Benefitly keeps money moving safely.</h1>
        <p className="lede">
          Benefitly moves real money on behalf of real people and organizations, so we hold every campaign,
          association and donor to the same regulatory bar our payment partners hold us to. This page is a plain-language
          summary of that program. <strong>It is a working draft pending final review by qualified legal counsel</strong> and
          does not itself constitute legal advice; it will be superseded by our finalized Terms of Service and Acceptable
          Use Policy before any live, real-money processing goes live.
        </p>

        <section className="section legal-section">
          <h2>Anti-money laundering &amp; counter-terrorist financing (AML/CFT)</h2>
          <p>
            Benefitly does not custody funds itself &mdash; every donation is processed and held by a licensed,
            regulated payment institution (currently Stripe, via Stripe Connect, and Adyen, via Adyen for Platforms),
            each of which operates its own bank-partnered money transmission and AML program. Benefitly&apos;s own program
            is built on top of theirs and includes:
          </p>
          <ul>
            <li>
              <strong>Identity verification (KYC/KYB).</strong> Before any organizer, campaign beneficiary or
              association can receive a payout, they must complete our payment partner&apos;s identity verification flow
              &mdash; individuals provide government ID and personal details; organizations provide registration
              documents, beneficial-ownership information and a responsible-party identity check.
            </li>
            <li>
              <strong>Sanctions &amp; watchlist screening.</strong> Every payout recipient is screened against OFAC&apos;s
              Specially Designated Nationals list and other applicable sanctions and watchlists before funds are
              released, and on an ongoing basis afterward. Accounts that match are frozen pending manual review.
            </li>
            <li>
              <strong>Transaction monitoring.</strong> Donation and payout activity is monitored for patterns
              associated with money laundering, structuring, or terrorist financing (rapid-fire small donations,
              circular giving between related accounts, payout requests inconsistent with a campaign&apos;s stated
              purpose, etc.). Flagged activity is held for manual review before funds move.
            </li>
            <li>
              <strong>Recordkeeping.</strong> Donor, organizer and transaction records are retained for the period
              required by applicable law and our payment partners&apos; own compliance obligations, and are made
              available to regulators and law enforcement on lawful request.
            </li>
            <li>
              <strong>Suspicious activity reporting.</strong> Where Benefitly or its payment partners identify activity
              that reasonably appears to involve fraud, money laundering, or other financial crime, it is escalated
              internally and reported to the relevant authority or financial institution as legally required.
            </li>
          </ul>
          <p className="muted">
            Because live money movement depends on our payment partners&apos; own underwriting, a campaign or
            organization can be declined, paused, or offboarded at their discretion as well as ours &mdash; independent
            of anything Benefitly itself decides.
          </p>
        </section>

        <section className="section legal-section">
          <h2>Donor protection</h2>
          <ul>
            <li>Funds are held by our payment partner until a campaign passes review, not released on pledge alone.</li>
            <li>Payouts to organizers require a documented request and, for larger or higher-risk payouts, a second-person approval before funds move.</li>
            <li>Every campaign can be reported by any visitor; reports route to manual moderation, not an automated takedown.</li>
            <li>Refunds are available consistent with our payment partners&apos; dispute and chargeback processes.</li>
          </ul>
        </section>

        <section className="section legal-section">
          <h2>Prohibited uses</h2>
          <p>The following are never permitted on Benefitly, on any campaign, association, or personal giving profile:</p>
          <ul>
            <li>Misrepresenting who is raising funds, who will receive them, or what they will be used for.</li>
            <li>Raising funds for an individual or purpose that does not exist, or that the organizer does not have a good-faith connection to.</li>
            <li>Using donated funds for anything materially different from the stated campaign purpose without disclosing the change to donors.</li>
            <li>Fraud, identity theft, or impersonating another person or organization.</li>
            <li>Money laundering, terrorist financing, or structuring transactions to evade reporting thresholds.</li>
            <li>Bribery, kickbacks, or facilitation payments to public officials.</li>
            <li>Harassment, hate speech, discrimination, or content that threatens or incites violence against a person or group.</li>
            <li>Sale of goods or services disguised as a charitable or personal-needs campaign.</li>
            <li>Any activity that is illegal in the jurisdiction where the organizer, beneficiary, or donor is located.</li>
            <li>Circumventing sanctions, export controls, or OFAC restrictions, including raising or directing funds to a sanctioned individual, entity, or jurisdiction.</li>
          </ul>
        </section>

        <section className="section legal-section">
          <h2>Prohibited &amp; restricted industries</h2>
          <p>
            Because Benefitly relies on regulated payment processors, campaigns and organizations in the categories
            below cannot be supported on the platform. This list follows standard payment-processor restricted-business
            categories (Stripe and Adyen each publish their own, more detailed versions) and will be updated as those
            change:
          </p>
          <div className="compliance-grid">
            <div>
              <h3>Never permitted</h3>
              <ul>
                <li>Illegal drugs or controlled substances, and drug paraphernalia</li>
                <li>Firearms, ammunition, explosives, or weapon conversion parts</li>
                <li>Child exploitation material in any form</li>
                <li>Human trafficking or forced labor</li>
                <li>Terrorism or violent extremism, including material support</li>
                <li>Counterfeit goods or intellectual-property infringing products</li>
                <li>Ponzi, pyramid, or other fraudulent investment schemes</li>
                <li>Unlicensed money transmission or currency exchange</li>
                <li>Bail funds for offenses involving violence against another person</li>
              </ul>
            </div>
            <div>
              <h3>Restricted (case-by-case, added underwriting)</h3>
              <ul>
                <li>Adult content or services</li>
                <li>Gambling, sports betting, and games of chance</li>
                <li>Cryptocurrency, NFTs, and other digital-asset offerings</li>
                <li>Multi-level marketing (MLM) or affiliate-recruitment schemes</li>
                <li>Debt collection, credit repair, or payday lending</li>
                <li>Cannabis and CBD businesses, even where locally legal</li>
                <li>Political campaigns, PACs, and lobbying (routed to specialized providers, not general fundraising)</li>
                <li>Pharmaceuticals, supplements, and unproven medical treatments</li>
              </ul>
            </div>
          </div>
          <p className="muted">
            Individuals or organizations located in, or funds directed to, a country or region subject to comprehensive
            U.S. or other applicable sanctions cannot use Benefitly, regardless of category.
          </p>
        </section>

        <section className="section legal-section">
          <h2>How enforcement works</h2>
          <ol>
            <li>Every new campaign and organization goes through review before it can accept public donations.</li>
            <li>Reports and automated fraud signals route to a human moderator, who can request more information, pause, or reject.</li>
            <li>Confirmed violations result in campaign or account suspension, held or reversed funds, and, where required, a report to our payment partners or the relevant authority.</li>
            <li>Organizers and organizations can appeal a moderation decision; sanctions- or law-enforcement-driven holds cannot be appealed on the platform.</li>
          </ol>
        </section>

        <section className="section legal-section">
          <p className="muted">
            Questions about a specific campaign, organization, or this policy can be sent through the report link on
            any campaign page, or by contacting Benefitly support. See also{" "}
            <Link className="text-link" href="/organizations">
              running an organization on Benefitly
            </Link>
            .
          </p>
        </section>
      </main>
    </>
  );
}
