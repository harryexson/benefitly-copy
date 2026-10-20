import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "Acceptable Use Policy" };

export default function AcceptableUsePage() {
  return (
    <>
      <SiteHeader />
      <main className="page legal-page">
        <p className="kicker">Compliance</p>
        <h1>Acceptable Use Policy</h1>
        <p className="lede">Platform usage restrictions that apply to every organization, member, and campaign on Benefitly.</p>

        <section className="section legal-section">
          <div className="prohibited-box" role="alert">
            <p className="prohibited-label">Benefitly strictly prohibits use for:</p>
            <ul>
              <li>Cryptocurrency transactions</li>
              <li>Gambling or betting services</li>
              <li>Adult content distribution</li>
              <li>Sweepstakes or prize schemes</li>
              <li>High-risk financial instruments</li>
              <li>Money transmission or remittance services</li>
              <li>Unlicensed financial activity</li>
            </ul>
            <p className="prohibited-warning">⚠️ Violation of this policy results in immediate suspension and termination.</p>
          </div>
          <p className="muted">
            This restriction applies regardless of how an organization is described at signup: if the activity funded,
            claimed, or disbursed through Benefitly falls into any of the categories above, the account is subject to
            immediate suspension and termination, and any related funds handling is referred to our payment partners
            and, where required, the relevant authority.
          </p>
        </section>

        <section className="section legal-section">
          <h2>Also prohibited</h2>
          <ul>
            <li>Misrepresenting who a member, claim, or campaign beneficiary is</li>
            <li>Using benefit funds or campaign proceeds for a purpose other than what was disclosed</li>
            <li>Fraud, identity theft, or impersonating another person or organization</li>
            <li>Money laundering, terrorist financing, or structuring to evade reporting thresholds</li>
            <li>Bribery, kickbacks, or facilitation payments to public officials</li>
            <li>Harassment, hate speech, or content that threatens or incites violence</li>
            <li>Any activity that is illegal in the jurisdiction where the organization, member, or donor is located</li>
            <li>Circumventing sanctions, export controls, or OFAC restrictions</li>
          </ul>
        </section>

        <section className="section legal-section">
          <h2>Enforcement</h2>
          <ol>
            <li>Every new organization and campaign goes through review before activation.</li>
            <li>Reports and fraud signals route to manual review, not an automated takedown.</li>
            <li>Confirmed violations result in immediate suspension, held or reversed funds, and, where required, a report to our payment partners or the relevant authority.</li>
            <li>Sanctions- or law-enforcement-driven holds cannot be appealed on the platform.</li>
          </ol>
        </section>

        <section className="section legal-section" style={{ paddingBottom: 56 }}>
          <p className="muted">
            See also the full{" "}
            <Link className="text-link" href="/legal/compliance">
              AML &amp; compliance policy
            </Link>{" "}
            and{" "}
            <Link className="text-link" href="/legal/terms">
              Terms of Service
            </Link>
            . This page is a working draft pending final legal review.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
