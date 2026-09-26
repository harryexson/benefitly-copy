import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "Benefit Programs & Claims" };

export default function BenefitProgramsPage() {
  return (
    <>
      <SiteHeader />
      <main className="page legal-page">
        <p className="kicker">Solutions</p>
        <h1>Benefit programs &amp; claims</h1>
        <p className="lede">Structured, documented decisions on every member benefit &mdash; not an inbox of requests.</p>
        <section className="section legal-section" style={{ paddingBottom: 56 }}>
          <ul>
            <li>Set up a benefit program with an eligibility description and payout cap</li>
            <li>Members submit claims with supporting details</li>
            <li>Every decision is approved or denied with a documented reason and a named decider</li>
            <li>Approved claims are disbursed through a regulated third-party payment provider</li>
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
