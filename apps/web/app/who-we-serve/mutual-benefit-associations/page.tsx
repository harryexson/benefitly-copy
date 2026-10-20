import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "Mutual Benefit Associations" };

export default function MutualBenefitPage() {
  return (
    <>
      <SiteHeader />
      <main className="page legal-page">
        <p className="kicker">Who we serve</p>
        <h1>Mutual benefit associations</h1>
        <p className="lede">
          Member-funded organizations that exist to support their own members through hardship &mdash; burial
          societies, mutual aid networks, and similar associations &mdash; need claims handled fairly and
          documented, not tracked in someone&apos;s inbox.
        </p>
        <section className="section legal-section" style={{ paddingBottom: 56 }}>
          <ul>
            <li>Dues tracking per member</li>
            <li>Benefit programs with eligibility rules and payout caps</li>
            <li>A documented approve/deny decision on every claim</li>
          </ul>
          <p>
            <Link className="text-link" href="/solutions/benefit-programs">
              See benefit programs &amp; claims
            </Link>
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
