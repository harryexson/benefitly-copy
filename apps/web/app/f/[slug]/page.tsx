import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getPublishedCampaignBySlug } from "@/lib/campaigns";
import { percentage } from "@benefitly/domain";

export const dynamic = "force-dynamic";

export default async function CampaignPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const campaign = await getPublishedCampaignBySlug(slug).catch(() => null);
  if (!campaign) notFound();

  const funded = percentage(campaign.raised_amount, campaign.goal_amount);
  return (
    <>
      <SiteHeader />
      <main className="campaign-page">
        <img className="campaign-hero-image" src={campaign.image ?? undefined} alt="" />
        <section>
          <p className="category">{campaign.category}</p>
          <h1>{campaign.title}</h1>
          <p className="lede">
            Organized by {campaign.organizer}
            {campaign.location ? ` in ${campaign.location}` : ""}
          </p>
          <div className="progress large">
            <span style={{ width: `${funded}%` }} />
          </div>
          <p className="amount">
            <strong>${(campaign.raised_amount / 100).toLocaleString()}</strong> raised of ${(campaign.goal_amount / 100).toLocaleString()}
          </p>
          <p>{campaign.supporter_count} people are supporting this fundraiser.</p>
          <p style={{ whiteSpace: "pre-wrap" }}>{campaign.story}</p>
        </section>
        <aside className="donate-panel">
          <h2>Help this campaign</h2>
          <p>Your donation goes to the campaign. An optional Benefitly contribution is always shown separately.</p>
          <a className="button" href={`/donate/${campaign.id}`}>
            Donate
          </a>
          <a className="share" href={`/f/${campaign.slug}`}>
            Share campaign
          </a>
          <a className="text-link" href={`/f/${campaign.slug}/report`} style={{ display: "block", marginTop: 16 }}>
            Report this campaign
          </a>
        </aside>
      </main>
    </>
  );
}
