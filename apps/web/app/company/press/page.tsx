import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "Press Kit" };

export default function PressPage() {
  return (
    <>
      <SiteHeader />
      <main className="page legal-page">
        <p className="kicker">Company</p>
        <h1>Press Kit</h1>
        <p className="lede">Boilerplate and media contact for anyone writing about Benefitly.</p>

        <section className="section legal-section">
          <h2>Boilerplate</h2>
          <p>
            Benefitly is administrative technology for benefits management &mdash; a multi-tenant SaaS platform that
            lets verified mutual benefit associations, member-based organizations, and professional associations
            manage member benefits and community fundraising through structured, auditable workflows. Benefitly is a
            software service provider, not a payment processor or financial institution; all financial transactions
            are processed through regulated third-party payment providers.
          </p>
        </section>

        <section className="section legal-section" style={{ paddingBottom: 56 }}>
          <h2>Media contact</h2>
          <p className="muted">press@benefitly.app</p>
          <p>
            <Link className="text-link" href="/resources/contact">
              Contact Us
            </Link>
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
