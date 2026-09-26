import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "Reporting" };

export default function ReportingPage() {
  return (
    <>
      <SiteHeader />
      <main className="page legal-page">
        <p className="kicker">Platform</p>
        <h1>Audit-ready reporting for your board and treasurer.</h1>
        <p className="lede">
          Every benefit decision, dues contribution, and campaign transaction on Benefitly is recorded with an actor,
          a timestamp, and a reason where applicable &mdash; so your reporting isn&apos;t reconstructed after the
          fact.
        </p>

        <section className="section legal-section">
          <h2>What's tracked</h2>
          <ul>
            <li>Member dues and one-off contributions, per member</li>
            <li>Benefit claims: submission, decision, decision reason, and decider</li>
            <li>Campaign donations, refunds, and payout requests with approval history</li>
            <li>Moderation actions taken on campaigns and organizations</li>
          </ul>
        </section>

        <section className="section legal-section" style={{ paddingBottom: 56 }}>
          <h2>Exports</h2>
          <p className="muted">
            Structured exports for board reporting and accounting reconciliation are on our roadmap. Today,
            transaction and claim history is available in your organization&apos;s workspace. See{" "}
            <Link className="text-link" href="/product/integrations">
              Integrations
            </Link>{" "}
            for what&apos;s planned.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
