import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getOrganizationBySlug, listSubscriptionPlans } from "@/lib/associations";
import { loadBillingContext, sellablePlanTiers } from "@/lib/billing";
import { requireSession } from "@/lib/session";
import { BillingActions } from "./billing-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Plan & billing" };

function money(cents: number) {
  return `$${(cents / 100).toLocaleString()}`;
}

export default async function OrganizationBillingPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ checkout?: string }> }) {
  const { slug } = await params;
  const { checkout } = await searchParams;
  const session = await requireSession();
  if (!session) redirect(`/sign-in?redirect=${encodeURIComponent(`/org/${slug}/billing`)}`);

  const org = await getOrganizationBySlug(session.user.id, slug);
  if (!org) notFound();

  let context;
  try {
    context = await loadBillingContext(session.user.id, org.id);
  } catch {
    return (
      <>
        <SiteHeader />
        <main className="page">
          <h1>Plan &amp; billing</h1>
          <p className="muted">Only organization managers can change the plan or billing details.</p>
        </main>
      </>
    );
  }

  const plans = await listSubscriptionPlans();
  const currentName = plans.find((p) => p.tier === context.plan_tier)?.name ?? context.plan_tier;
  const subscribed = context.subscription_status === "active";

  return (
    <>
      <SiteHeader />
      <main className="page">
        <p className="kicker">{context.org_name}</p>
        <h1>Plan &amp; billing</h1>
        {checkout === "success" && <p role="status">Thanks. Your plan updates as soon as Stripe confirms the payment.</p>}
        {checkout === "canceled" && <p className="muted">Checkout was canceled. Your plan is unchanged.</p>}
        <p>
          Current plan: <strong>{currentName}</strong>
          {context.subscription_status !== "none" && <span className="muted"> · subscription {context.subscription_status}</span>}
        </p>

        <section className="section" style={{ padding: "24px 0" }}>
          <div className="admin-nav-grid">
            {plans.map((plan) => (
              <div className="stat-tile" key={plan.tier}>
                <h2>{plan.name}</h2>
                <p className="stat-value">
                  {plan.monthly_price_cents == null ? "Custom" : plan.monthly_price_cents === 0 ? "Free" : `${money(plan.monthly_price_cents)}/mo`}
                </p>
                {plan.annual_price_cents != null && plan.annual_price_cents > 0 && <p className="muted">or {money(plan.annual_price_cents)}/year</p>}
                <p className="muted">{plan.member_limit != null ? `Up to ${plan.member_limit.toLocaleString()} members` : "Unlimited members"}</p>
                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <p className="muted">
          {subscribed
            ? "To change or cancel your subscription, use Manage billing below."
            : "Choose a paid plan to start. Stripe handles payment; Benefitly never sees your card details."}{" "}
          Need Enterprise? <Link href="/resources/contact">Contact us</Link>.
        </p>

        <BillingActions orgId={org.id} planTier={context.plan_tier} canOpenPortal={context.stripe_customer_id != null} sellable={sellablePlanTiers()} />
        {sellablePlanTiers().length < 3 && (
          <p className="muted">Growth and Scale are coming soon. <Link href="/resources/contact">Ask us about them</Link>.</p>
        )}
      </main>
    </>
  );
}
