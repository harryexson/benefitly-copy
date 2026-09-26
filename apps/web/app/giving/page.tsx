import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { GivingPlan } from "@/components/giving-plan";
import { listPublishedCampaigns } from "@/lib/campaigns";
import type { CampaignSummary } from "@benefitly/domain";

export const metadata = { title: "Generosity In Action" };
export const dynamic = "force-dynamic";

export default async function GivingPage() {
  let campaigns: CampaignSummary[] = [];
  let unavailable = false;
  try {
    const rows = await listPublishedCampaigns({});
    campaigns = rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      organizer: row.organizer,
      location: row.location ?? undefined,
      category: row.category,
      raised: { amount: row.raised_amount, currency: row.currency },
      goal: { amount: row.goal_amount, currency: row.currency },
      supporterCount: row.supporter_count,
      image: row.image ?? "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=85",
      status: row.status,
    }));
  } catch {
    unavailable = true;
  }

  return (
    <>
      <SiteHeader />
      <main className="page">
        <section className="giving-hero">
          <p className="kicker">Generosity In Action</p>
          <h1>Charitable giving, with a plan behind it.</h1>
          <p className="lede">
            Real impact doesn&apos;t happen by accident. It happens when generosity has direction &mdash; a cause you
            believe in, a goal you hold yourself to, and a record of the difference you&apos;ve actually made. This is
            your space to turn good intentions into making the world a better place, one deliberate gift at a time.
          </p>
          <div className="impact-words">
            <span>Charitable Giving</span>
            <span>Making a Difference</span>
            <span>Real Impact</span>
            <span>Generosity In Action</span>
          </div>
        </section>

        {unavailable && <p className="muted">Campaigns can&apos;t be loaded right now. Please try again shortly.</p>}
        {!unavailable && <GivingPlan campaigns={campaigns} />}
      </main>
      <SiteFooter />
    </>
  );
}
