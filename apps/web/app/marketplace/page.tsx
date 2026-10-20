import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AddCharityToPlanButton } from "@/components/add-charity-to-plan-button";
import { listCharityDirectory } from "@/lib/donor";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Giving Marketplace" };

const categoryLabels: Record<string, string> = {
  "international-relief": "International Relief",
  "disaster-relief": "Disaster Relief",
  "hunger-relief": "Hunger Relief",
  "poverty-alleviation": "Poverty Alleviation",
  "child-welfare": "Child Welfare",
  "medical-aid": "Medical Aid",
  "medical-research": "Medical Research",
  housing: "Housing",
};

export default async function MarketplacePage() {
  const session = await requireSession();
  let charities: Awaited<ReturnType<typeof listCharityDirectory>> = [];
  let unavailable = false;
  try {
    charities = await listCharityDirectory();
  } catch {
    unavailable = true;
  }

  return (
    <>
      <SiteHeader />
      <main className="page">
        <section className="giving-hero">
          <p className="kicker">Giving Marketplace</p>
          <h1>A trusted pool of causes to give to.</h1>
          <p className="lede">
            Beyond fundraisers hosted on Benefitly, here&apos;s a curated directory of well-known, reputable charitable
            organizations. Add one to your giving plan to track your intent here, then give directly on the
            organization&apos;s own site &mdash; Benefitly doesn&apos;t yet process payments on their behalf, so this is a
            planning and record-keeping tool, not a checkout.
          </p>
        </section>

        {unavailable && <p className="muted">The directory can&apos;t be loaded right now. Please try again shortly.</p>}

        {!unavailable && (
          <div className="campaign-grid">
            {charities.map((charity) => (
              <article className="campaign-card" key={charity.id}>
                <div className="campaign-copy">
                  <p className="category">{categoryLabels[charity.category] ?? charity.category}</p>
                  <h3>{charity.name}</h3>
                  <p className="muted">{charity.mission}</p>
                  {charity.ein && <p className="muted">EIN {charity.ein}</p>}
                  <div className="giving-card-actions">
                    <a className="button small" href={charity.website_url} target="_blank" rel="noopener noreferrer">
                      Give on their site
                    </a>
                    {session ? (
                      <AddCharityToPlanButton charityId={charity.id} charityName={charity.name} />
                    ) : (
                      <Link className="share" href="/sign-in">
                        Sign in to plan
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <p className="muted" style={{ marginTop: 32 }}>
          Know a reputable organization that should be here?{" "}
          <Link className="text-link" href="/resources/contact">
            Let us know
          </Link>
          .
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
