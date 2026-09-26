import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "About Us" };

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main className="page legal-page">
        <p className="kicker">Company</p>
        <h1>Structured generosity, done right.</h1>
        <p className="lede">
          Mutual benefit associations, faith communities, and professional associations have run member benefit
          programs for generations &mdash; mostly on spreadsheets, paper claims, and trust. Benefitly exists to give
          them software that matches the seriousness of what they do, without asking them to become a financial
          institution to use it.
        </p>

        <section className="section legal-section">
          <h2>What we believe</h2>
          <ul>
            <li>Benefit administration should be auditable, not just well-intentioned.</li>
            <li>Software should never require an association to touch money it isn&apos;t equipped to hold.</li>
            <li>Compliance is a feature, not a tax &mdash; it&apos;s what lets small organizations operate with the same rigor as large ones.</li>
          </ul>
        </section>

        <section className="section legal-section" style={{ paddingBottom: 56 }}>
          <h2>What we build</h2>
          <p>
            Membership tracking, benefit programs and claims, events, community fundraising, and audit-ready records
            &mdash; all administrative, with every dollar routed through regulated third-party payment providers. See{" "}
            <Link className="text-link" href="/product/features">
              Features
            </Link>{" "}
            or our{" "}
            <Link className="text-link" href="/legal/compliance">
              compliance program
            </Link>
            .
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
