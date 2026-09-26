import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "Membership Management" };

export default function MembershipManagementPage() {
  return (
    <>
      <SiteHeader />
      <main className="page legal-page">
        <p className="kicker">Solutions</p>
        <h1>Membership management</h1>
        <p className="lede">A single, searchable roster for every member your association serves.</p>
        <section className="section legal-section" style={{ paddingBottom: 56 }}>
          <ul>
            <li>Add members individually with a member number, tier, and contact details</li>
            <li>Track status (active, lapsed, pending) per member</li>
            <li>Role-based staff access, scoped to your organization only</li>
            <li>A foundation every other Benefitly tool &mdash; dues, benefits, events &mdash; builds on</li>
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
