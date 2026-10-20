import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "Careers" };

export default function CareersPage() {
  return (
    <>
      <SiteHeader />
      <main className="page legal-page">
        <p className="kicker">Company</p>
        <h1>Careers</h1>
        <p className="lede">We&apos;re a small team building compliance-forward software for mutual benefit associations.</p>
        <section className="section legal-section" style={{ paddingBottom: 56 }}>
          <p className="muted">No open roles right now. Check back, or reach out through Contact Us if you think you&apos;d be a fit anyway.</p>
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
