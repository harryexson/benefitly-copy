import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { listSubscriptionPlans, type SubscriptionPlan } from "@/lib/associations";

export const metadata = { title: "Pricing" };
export const dynamic = "force-dynamic";

const FALLBACK_PLANS: SubscriptionPlan[] = [
  { tier: "free", name: "Free", member_limit: 25, monthly_price_cents: 0, annual_price_cents: 0, sort_order: 0, features: ["Up to 25 members", "Member invitations by email", "Donations with optional donor tips", "Campaigns, events and ticket sales", "Community email support"] },
  { tier: "starter", name: "Starter", member_limit: 100, monthly_price_cents: 2900, annual_price_cents: 29000, sort_order: 1, features: ["Up to 100 members", "Everything in Free, plus:", "Member dues collection through Stripe", "Benefit programs and approved payouts"] },
  { tier: "growth", name: "Growth", member_limit: 500, monthly_price_cents: 7900, annual_price_cents: 79000, sort_order: 2, features: ["Up to 500 members", "Everything in Starter, plus:", "Priority email support"] },
  { tier: "scale", name: "Scale", member_limit: 2000, monthly_price_cents: 19900, annual_price_cents: 199000, sort_order: 3, features: ["Up to 2,000 members", "Everything in Growth"] },
  { tier: "enterprise", name: "Enterprise", member_limit: null, monthly_price_cents: null, annual_price_cents: null, sort_order: 4, features: ["Unlimited members", "Everything in Scale", "Custom contract terms"] },
];

const trustPoints = [
  { title: "Compliance-First Infrastructure", body: "Business verification, AML screening, and moderation review built into every plan, not an add-on." },
  { title: "Bank-Level Security", body: "Data encrypted in transit and at rest, with role-based access scoped to each organization." },
  { title: "Audit-Ready Reporting", body: "Every benefit decision and transaction recorded with an actor and a reason, ready for your board." },
  { title: "Global Payout Support", body: "Disbursements routed through regulated payment providers, built to support organizations beyond the U.S." },
];

export default async function PricingPage() {
  let plans: SubscriptionPlan[] = [];
  let usedFallback = false;
  try {
    plans = await listSubscriptionPlans();
    if (plans.length === 0) throw new Error("empty");
  } catch {
    plans = FALLBACK_PLANS;
    usedFallback = true;
  }

  const paidTiers = plans.filter((p) => p.tier !== "enterprise");
  const enterprise = plans.find((p) => p.tier === "enterprise");
  const featured = "starter";

  return (
    <>
      <SiteHeader />
      <main className="page">
        <p className="kicker">Solutions</p>
        <h1>Pricing that makes sense for your budget.</h1>
        <p className="lede">
          45% cheaper than Wild Apricot and Bloomerang. Benefitly charges a platform subscription for administrative
          tools &mdash; we are not a payment processor, so we do not take a cut of your members&apos; dues or your
          donors&apos; gifts. Stripe&apos;s own processing fees are separate and billed directly by Stripe &mdash;
          every card, Apple Pay, Google Pay, and ACH/EFT transaction runs through Benefitly&apos;s own built-in
          checkout, never an external Stripe account.
        </p>

        <section className="trust-bar" aria-label="Platform trust highlights">
          {trustPoints.map((point) => (
            <div key={point.title}>
              <strong>{point.title}</strong>
              <p className="muted">{point.body}</p>
            </div>
          ))}
        </section>

        <section className="pricing-grid">
          {paidTiers.map((plan) => (
            <div className={`pricing-card${plan.tier === featured ? " featured" : ""}`} key={plan.tier}>
              {plan.tier === featured && <span className="pricing-badge">Most Popular</span>}
              <h3>{plan.name}</h3>
              <p className="pricing-price">
                ${plan.monthly_price_cents != null ? (plan.monthly_price_cents / 100).toFixed(0) : "—"}
                <span>/month</span>
              </p>
              {plan.annual_price_cents != null && plan.monthly_price_cents != null && (
                <p className="pricing-save">Save ${(plan.monthly_price_cents * 12 - plan.annual_price_cents) / 100} with annual billing</p>
              )}
              <p className="muted">{plan.member_limit != null ? `Up to ${plan.member_limit.toLocaleString()} members` : "Unlimited members"}</p>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <Link className="button small" href="/sign-up" style={{ width: "100%" }}>
                Start free trial
              </Link>
            </div>
          ))}
        </section>

        {enterprise && (
          <section className="pricing-enterprise">
            <div>
              <span className="pricing-badge" style={{ position: "static", transform: "none", display: "inline-block", marginBottom: 10 }}>
                Enterprise
              </span>
              <h2 style={{ margin: "6px 0 4px", color: "#fff" }}>Custom pricing</h2>
              <p style={{ margin: 0, color: "#c5d2e8" }}>Tailored for your needs &mdash; over 1,000 members</p>
              <ul>
                {enterprise.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>
            <div style={{ textAlign: "right" }}>
              <Link className="button" href="/resources/contact">
                Contact sales
              </Link>
              <p className="muted" style={{ marginTop: 10, color: "#8fa0bd" }}>
                24/7 phone support &middot; SLA guarantee
              </p>
            </div>
          </section>
        )}

        <section className="section legal-section" style={{ padding: "40px 0 56px" }}>
          <p className="muted">
            Every plan includes business verification, AML screening, and the same compliance standards described in
            our{" "}
            <Link className="text-link" href="/legal/compliance">
              AML &amp; compliance policy
            </Link>
            . Member limits are enforced automatically as your roster grows &mdash; you&apos;ll be prompted to
            upgrade before you&apos;re blocked from adding someone new.
          </p>
          {usedFallback && <p className="muted">(Showing standard pricing &mdash; live plan data couldn&apos;t be loaded right now.)</p>}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
