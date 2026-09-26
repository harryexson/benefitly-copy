import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "Dues & Contributions" };

export default function DuesPage() {
  return (
    <>
      <SiteHeader />
      <main className="page legal-page">
        <p className="kicker">Solutions</p>
        <h1>Dues &amp; contributions</h1>
        <p className="lede">Track what every member owes and what they&apos;ve paid, tied directly to their record.</p>
        <section className="section legal-section" style={{ paddingBottom: 56 }}>
          <ul>
            <li>Record dues and one-off contributions against a member&apos;s profile</li>
            <li>A running history your treasurer can reference without a spreadsheet</li>
            <li>Processed through regulated third-party payment providers &mdash; Benefitly never holds the funds</li>
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
