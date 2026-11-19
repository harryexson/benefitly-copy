import { notFound } from "next/navigation";
import { getPublishedCampaignBySlug } from "@/lib/campaigns";
import { percentage } from "@benefitly/domain";

export const dynamic = "force-dynamic";
export const metadata = { title: "Donate", robots: { index: false, follow: false } };

// A compact, frame-friendly summary of a campaign. It shows progress and links out to the full
// campaign page to donate, so payment details are never collected inside a third-party site's frame.
// next.config.ts allows this one route to be framed from any origin.
export default async function CampaignEmbedPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const campaign = await getPublishedCampaignBySlug(slug).catch(() => null);
  if (!campaign) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://benefitly-web.vercel.app";
  const campaignUrl = `${baseUrl}/f/${campaign.slug}`;
  const funded = percentage(campaign.raised_amount, campaign.goal_amount);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: 16, maxWidth: 420, margin: "0 auto", color: "#1d1d1f" }}>
      <p style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, margin: 0, color: "#6e6e73" }}>{campaign.category}</p>
      <h1 style={{ fontSize: 20, margin: "4px 0 12px" }}>{campaign.title}</h1>
      <div style={{ height: 10, background: "#e5e5ea", borderRadius: 6, overflow: "hidden" }}>
        <div style={{ width: `${funded}%`, height: "100%", background: "#0a7f5a" }} />
      </div>
      <p style={{ margin: "8px 0 14px", fontSize: 14 }}>
        <strong>${(campaign.raised_amount / 100).toLocaleString()}</strong> raised of ${(campaign.goal_amount / 100).toLocaleString()} · {campaign.supporter_count}{" "}
        {campaign.supporter_count === 1 ? "supporter" : "supporters"}
      </p>
      <a
        href={campaignUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: "block", textAlign: "center", background: "#0a7f5a", color: "#fff", padding: "12px 16px", borderRadius: 8, textDecoration: "none", fontWeight: 600 }}
      >
        Donate
      </a>
      <p style={{ fontSize: 11, color: "#6e6e73", marginTop: 10, textAlign: "center" }}>Powered by Benefitly</p>
    </main>
  );
}
