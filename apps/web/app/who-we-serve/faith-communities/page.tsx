import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "Faith Communities" };

export default function FaithCommunitiesPage() {
  return (
    <>
      <SiteHeader />
      <main className="page legal-page">
        <p className="kicker">Who we serve</p>
        <h1>Faith-based membership communities</h1>
        <p className="lede">
          Congregations and faith-based membership organizations use Benefitly to run member care funds, facility
          campaigns, and events, alongside their existing membership records.
        </p>
        <section className="section legal-section" style={{ paddingBottom: 56 }}>
          <ul>
            <li>Member care and emergency assistance funds with a documented decision process</li>
            <li>Building and facility campaigns with progress updates</li>
            <li>Events and announcements for your congregation</li>
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
