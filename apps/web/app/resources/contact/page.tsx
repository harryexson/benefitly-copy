import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "Contact Us" };

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="page legal-page">
        <p className="kicker">Resources</p>
        <h1>Contact Us</h1>
        <p className="lede">We read every message. Here&apos;s the fastest way to reach the right team.</p>

        <section className="section legal-section">
          <div className="compliance-grid">
            <div>
              <h3>General &amp; account support</h3>
              <p className="muted">support@benefitly.app</p>
              <p className="muted">Typical response within one business day.</p>
            </div>
            <div>
              <h3>Compliance &amp; trust</h3>
              <p className="muted">compliance@benefitly.app</p>
              <p className="muted">
                For reporting a campaign, a suspected policy violation, or questions about our{" "}
                <Link className="text-link" href="/legal/compliance">
                  AML &amp; compliance
                </Link>{" "}
                program.
              </p>
            </div>
            <div>
              <h3>Security</h3>
              <p className="muted">security@benefitly.app</p>
              <p className="muted">Responsible disclosure of a security issue.</p>
            </div>
            <div>
              <h3>Press</h3>
              <p className="muted">press@benefitly.app</p>
              <p className="muted">
                See our{" "}
                <Link className="text-link" href="/company/press">
                  Press Kit
                </Link>
                .
              </p>
            </div>
          </div>
        </section>

        <section className="section legal-section" style={{ paddingBottom: 56 }}>
          <p className="muted">
            Placeholder contact addresses shown above will be replaced with live inboxes before launch.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
