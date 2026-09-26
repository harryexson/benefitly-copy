import { SiteHeader } from "@/components/site-header";
import { GivingPlan } from "@/components/giving-plan";
import { listPublishedCampaigns } from "@/lib/campaigns";
import type { CampaignSummary } from "@benefitly/domain";

export const metadata = { title: "Your giving plan" };
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
        <p className="kicker">For people who want to make a difference</p>
        <h1>Build a giving plan, not just a wish list.</h1>
        <p className="lede">
          Most giving happens on impulse, once, and then gets forgotten. A giving plan is the opposite: pick the causes
          you actually care about, set a goal you can hold yourself to, and keep a running record of the difference
          you&apos;ve made &mdash; all private to you, not a prepaid balance you have to hand over first.
        </p>

        {unavailable && <p className="muted">Campaigns can&apos;t be loaded right now. Please try again shortly.</p>}
        {!unavailable && <GivingPlan campaigns={campaigns} />}
      </main>
    </>
  );
}
