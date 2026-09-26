import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "Support Center" };

const faqs = [
  {
    q: "How long does organization verification take?",
    a: "Business verification typically completes within a few business days once your registration documents and EIN are submitted, depending on our payment provider's review.",
  },
  {
    q: "Why was my campaign or organization declined?",
    a: "Campaigns and organizations are reviewed against our Acceptable Use Policy and prohibited-industry list. If declined, you'll see the reason in your dashboard; some declines come from our payment partner's own underwriting, which Benefitly cannot override.",
  },
  {
    q: "How do members submit a benefit claim?",
    a: "From their member profile inside your organization's workspace, against any active benefit program they're eligible for.",
  },
  {
    q: "Where do donations and disbursements actually go?",
    a: "Through our regulated payment partners (Stripe, Tremendous) — Benefitly never holds or pools funds. See our AML & Compliance policy for details.",
  },
];

export default function SupportPage() {
  return (
    <>
      <SiteHeader />
      <main className="page legal-page">
        <p className="kicker">Resources</p>
        <h1>Support Center</h1>
        <p className="lede">Answers to common questions, and how to reach us for anything else.</p>

        <section className="section legal-section">
          <h2>Frequently asked</h2>
          {faqs.map((faq) => (
            <div key={faq.q} style={{ marginBottom: 18 }}>
              <h3 style={{ marginBottom: 4 }}>{faq.q}</h3>
              <p className="muted">{faq.a}</p>
            </div>
          ))}
        </section>

        <section className="section legal-section" style={{ paddingBottom: 56 }}>
          <h2>Still need help?</h2>
          <p>
            Reach our support team through{" "}
            <Link className="text-link" href="/resources/contact">
              Contact Us
            </Link>
            . For security reports, see{" "}
            <Link className="text-link" href="/product/security">
              Security
            </Link>
            .
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
