import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "Features" };

const groups = [
  {
    title: "Membership & association management",
    items: [
      "A searchable member roster with status, tiers, and contact details",
      "Dues and contribution tracking tied to each member's record",
      "Role-based permissions for board members, treasurers, and staff",
      "Organization-level dashboards for everything your association runs",
    ],
  },
  {
    title: "Benefit programs & claims",
    items: [
      "Configurable benefit programs with eligibility rules and payout limits",
      "Member-submitted claims with supporting details",
      "A documented approve/deny workflow with a reason on every decision",
      "Full claim history for audit and board reporting",
    ],
  },
  {
    title: "Events & communication",
    items: [
      "Event creation with capacity limits and member-only or public visibility",
      "Registration tracking per event",
      "Announcements to keep your whole membership in the loop",
      "Push and in-app notifications for claims, events, and campaign activity",
    ],
  },
  {
    title: "Campaigns & fundraising",
    items: [
      "Campaign creation tied to your organization, with photo and video media",
      "A moderation and review step before any campaign goes live",
      "Progress tracking, supporter counts, and campaign updates",
      "Reporting tools so your community can flag concerns",
    ],
  },
  {
    title: "Admin, trust & reporting",
    items: [
      "A moderation queue for every new campaign and reported campaign",
      "Fraud signal tracking and manual review before funds move",
      "Audit-ready transaction and disbursement records",
      "Row-level access control so data stays scoped to the right organization and user",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <>
      <SiteHeader />
      <main className="page">
        <p className="kicker">Product</p>
        <h1>Everything your association needs, in one workspace.</h1>
        <p className="lede">
          Benefitly is administrative technology for benefits management &mdash; the tools mutual benefit
          associations, member-based organizations, and professional associations need to run membership, benefits,
          events, and community fundraising with structure and accountability.
        </p>

        {groups.map((group) => (
          <section className="section legal-section" key={group.title} style={{ padding: "24px 0" }}>
            <h2>{group.title}</h2>
            <ul>
              {group.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}

        <section className="section legal-section" style={{ padding: "24px 0 56px" }}>
          <p className="muted">
            Every disbursement runs through regulated third-party payment providers &mdash; see{" "}
            <Link className="text-link" href="/product/integrations">
              integrations
            </Link>{" "}
            and our{" "}
            <Link className="text-link" href="/legal/compliance">
              AML &amp; compliance
            </Link>{" "}
            policy for how that works.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
