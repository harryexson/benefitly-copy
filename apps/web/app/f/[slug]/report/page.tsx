import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { ReportForm } from "@/components/report-form";
import { getPublishedCampaignBySlug } from "@/lib/campaigns";

export const dynamic = "force-dynamic";
export const metadata = { title: "Report a campaign" };

export default async function ReportCampaignPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const campaign = await getPublishedCampaignBySlug(slug).catch(() => null);
  if (!campaign) notFound();

  return (
    <>
      <SiteHeader />
      <main className="page">
        <p className="kicker">Report</p>
        <h1>Report &ldquo;{campaign.title}&rdquo;</h1>
        <p className="lede">Tell us what&apos;s wrong. Reports are reviewed by our trust and safety team, not the organizer.</p>
        <ReportForm campaignId={campaign.id} />
      </main>
    </>
  );
}
