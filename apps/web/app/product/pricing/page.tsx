import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "Pricing" };

const tiers = [
  {
    name: "Starter",
    audience: "Small associations getting organized",
    points: ["Up to 100 members", "Member roster, dues tracking, and one benefit program", "Event creation and announcements", "Email support"],
  },
  {
    name: "Growth",
    audience: "Established associations running multiple programs",
    points: ["Unlimited members", "Unlimited benefit programs and claims workflows", "Community fundraising campaigns with moderation review", "Role-based staff access and priority support"],
  },
  {
    name: "Enterprise",
    audience: "Multi-chapter organizations and federations",
    points: ["Multiple linked organizations under one account", "Custom approval workflows and audit exports", "Dedicated onboarding and a named support contact", "Custom contract terms"],
  },
];

export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <main className="page">
        <p className="kicker">Product</p>
        <h1>Pricing built around your membership, not your transaction volume.</h1>
        <p className="lede">
          Benefitly charges a platform subscription for administrative tools &mdash; we are not a payment processor,
          so we do not take a cut of your members&apos; dues or your donors&apos; gifts. Payment provider processing
          fees (Stripe, Tremendous) are separate and billed directly by those providers.
        </p>

        <section className="section" style={{ padding: "24px 0" }}>
          <div className="campaign-grid">
            {tiers.map((tier) => (
              <article className="campaign-card" key={tier.name}>
                <div className="campaign-copy">
                  <p className="category">{tier.name}</p>
                  <h3>{tier.audience}</h3>
                  <ul>
                    {tier.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section legal-section" style={{ padding: "24px 0 56px" }}>
          <p className="muted">
            These tiers are illustrative pending finalized pricing. Every plan includes business verification, AML
            screening, and the same compliance standards described in our{" "}
            <Link className="text-link" href="/legal/compliance">
              AML &amp; compliance policy
            </Link>
            .
          </p>
          <p>
            <Link className="button" href="/organizations">
              Talk to us about your association
            </Link>
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
