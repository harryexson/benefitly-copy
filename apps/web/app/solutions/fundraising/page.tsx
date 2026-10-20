import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "Community Fundraising" };

export default function FundraisingSolutionPage() {
  return (
    <>
      <SiteHeader />
      <main className="page legal-page">
        <p className="kicker">Solutions</p>
        <h1>Community fundraising</h1>
        <p className="lede">Campaigns tied to your organization, reviewed before they go live, with the same trust and safety standards as every campaign on Benefitly.</p>
        <section className="section legal-section">
          <ul>
            <li>Launch a campaign with photos, video, and a clear story</li>
            <li>Moderation review before any campaign can accept public donations</li>
            <li>Progress tracking, supporter counts, and campaign updates</li>
            <li>Payouts to your organization&apos;s verified payment account</li>
          </ul>
        </section>
        <section className="section legal-section" style={{ paddingBottom: 56 }}>
          <p>
            <Link className="text-link" href="/resources/fundraising-ideas">
              Fundraising ideas
            </Link>{" "}
            &middot;{" "}
            <Link className="text-link" href="/resources/fundraising-kits">
              Fundraising kits
            </Link>
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
