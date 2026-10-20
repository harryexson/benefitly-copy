import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "Community & Emergency Funds" };

export default function CommunityFundsPage() {
  return (
    <>
      <SiteHeader />
      <main className="page legal-page">
        <p className="kicker">Who we serve</p>
        <h1>Community &amp; emergency funds</h1>
        <p className="lede">
          Neighborhood associations and community groups that run a standing emergency fund need transparency for
          donors and a fair process for the people the fund is meant to help.
        </p>
        <section className="section legal-section" style={{ paddingBottom: 56 }}>
          <ul>
            <li>Community fundraising campaigns with moderation review before launch</li>
            <li>A documented process for who receives support and why</li>
            <li>Updates that show donors their gift reached its purpose</li>
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
