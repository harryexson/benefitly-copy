import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "Federated Accounts" };

export default function FederatedAccountsPage() {
  return (
    <>
      <SiteHeader />
      <main className="page legal-page">
        <p className="kicker">Platform</p>
        <h1>Built for chapters, not just one organization.</h1>
        <p className="lede">
          Associations with local chapters, regional bodies, or a national office need each level to manage its own
          members and benefits while staying connected to the parent organization.
        </p>

        <section className="section legal-section">
          <h2>How it works today</h2>
          <p>
            Each chapter operates as its own organization on Benefitly, with its own membership roster, benefit
            programs, and permissions. A member or admin can hold roles across more than one organization &mdash;
            useful for a national officer who also sits on a local chapter board.
          </p>
        </section>

        <section className="section legal-section" style={{ paddingBottom: 56 }}>
          <h2>On our roadmap</h2>
          <p className="muted">
            Roll-up reporting across linked chapters, shared national benefit programs, and single-sign-on across a
            federation&apos;s organizations are planned. If your association needs this now, tell us through{" "}
            <Link className="text-link" href="/resources/contact">
              Contact Us
            </Link>
            .
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
