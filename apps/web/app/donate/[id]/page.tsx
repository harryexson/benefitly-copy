import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { DonateForm } from "@/components/donate-form";
import { getPublishedCampaignById } from "@/lib/campaigns";
import { percentage } from "@benefitly/domain";

export const dynamic = "force-dynamic";
export const metadata = { title: "Donate" };

export default async function DonatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await getPublishedCampaignById(id).catch(() => null);
  if (!campaign) notFound();

  const funded = percentage(campaign.raised_amount, campaign.goal_amount);
  return (
    <>
      <SiteHeader />
      <main className="campaign-page">
        <section>
          <p className="category">{campaign.category}</p>
          <h1>Donate to {campaign.title}</h1>
          <p className="lede">Organized by {campaign.organizer}</p>
          <div className="progress large">
            <span style={{ width: `${funded}%` }} />
          </div>
          <p className="amount">
            <strong>${(campaign.raised_amount / 100).toLocaleString()}</strong> raised of ${(campaign.goal_amount / 100).toLocaleString()}
          </p>
        </section>
        <DonateForm campaignId={campaign.id} currency={campaign.currency} />
      </main>
    </>
  );
}
