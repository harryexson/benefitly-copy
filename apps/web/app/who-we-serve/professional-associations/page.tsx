import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "Professional Associations" };

export default function ProfessionalAssociationsPage() {
  return (
    <>
      <SiteHeader />
      <main className="page legal-page">
        <p className="kicker">Who we serve</p>
        <h1>Professional associations</h1>
        <p className="lede">
          Trade groups, alumni networks, and professional associations run dues, conferences, and member scholarship
          or hardship funds &mdash; often across several disconnected tools. Benefitly puts them in one workspace.
        </p>
        <section className="section legal-section" style={{ paddingBottom: 56 }}>
          <ul>
            <li>Annual dues and membership tier tracking</li>
            <li>Conference and event registration</li>
            <li>Member scholarship or hardship campaigns with review before launch</li>
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
