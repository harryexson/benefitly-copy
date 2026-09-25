import { CampaignCard } from "@/components/campaign-card";
import { SiteHeader } from "@/components/site-header";
import { listPublishedCampaigns } from "@/lib/campaigns";
import { campaignCategories, type CampaignSummary } from "@benefitly/domain";

export const metadata = { title: "Discover fundraisers" };
export const dynamic = "force-dynamic";

const categoryLabels: Record<string, string> = {
  emergency: "Emergency",
  medical: "Medical",
  memorial: "Memorial",
  education: "Education",
  community: "Community",
  faith: "Faith",
  disaster: "Disaster",
};

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const { q, category } = await searchParams;

  let campaigns: CampaignSummary[] = [];
  let unavailable = false;
  try {
    const rows = await listPublishedCampaigns({ q, category });
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
        <p className="kicker">Discover</p>
        <h1>Find a cause you can stand behind.</h1>
        <form className="search" action="/discover" method="get">
          <label htmlFor="q">Search fundraisers</label>
          <input id="q" name="q" defaultValue={q} placeholder="Search by cause, place or organizer" />
          <button className="button">Search</button>
        </form>
        <div className="filter-row" aria-label="Categories">
          <a href="/discover" className={!category ? "active" : undefined}>
            All
          </a>
          {campaignCategories.map((item) => (
            <a key={item} href={`/discover?category=${item}`} className={category === item ? "active" : undefined}>
              {categoryLabels[item]}
            </a>
          ))}
        </div>
        {unavailable && <p className="muted">Fundraisers can&apos;t be loaded right now. Please try again shortly.</p>}
        {!unavailable && campaigns.length === 0 && <p className="muted">No fundraisers match yet.</p>}
        <div className="campaign-grid">
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      </main>
    </>
  );
}
