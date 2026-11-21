import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SaveCampaignButton } from "@/components/save-campaign-button";
import { ShareCampaignButtons } from "@/components/share-campaign-buttons";
import { EmbedCodeBox } from "@/components/embed-code-box";
import { FeeTransparencyBanner } from "@/components/fee-transparency-banner";
import { getPublishedCampaignBySlug, listCampaignMedia, listCampaignUpdates } from "@/lib/campaigns";
import { mySavedCampaigns } from "@/lib/donor";
import { listCampaignEvents } from "@/lib/tickets";
import { requireSession } from "@/lib/session";
import { percentage } from "@benefitly/domain";

export const dynamic = "force-dynamic";

export default async function CampaignPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const campaign = await getPublishedCampaignBySlug(slug).catch(() => null);
  if (!campaign) notFound();

  const [media, updates, events] = await Promise.all([
    listCampaignMedia(campaign.id).catch(() => []),
    listCampaignUpdates(campaign.id).catch(() => []),
    listCampaignEvents(campaign.id).catch(() => []),
  ]);
  const funded = percentage(campaign.raised_amount, campaign.goal_amount);

  const session = await requireSession();
  const saved = session ? await mySavedCampaigns(session.user.id).catch(() => []) : [];
  const initiallySaved = saved.some((s) => s.campaign_id === campaign.id);
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

          {media.length > 1 && (
            <div className="filter-row" style={{ flexWrap: "wrap" }}>
              {media.slice(1).map((item) =>
                item.media_type === "video" ? (
                  <video key={item.id} src={item.storage_key} controls style={{ width: 220, height: 140, borderRadius: 10, objectFit: "cover" }} />
                ) : (
                  <img key={item.id} src={item.storage_key} alt={item.alt_text ?? ""} style={{ width: 220, height: 140, borderRadius: 10, objectFit: "cover" }} />
                ),
              )}
            </div>
          )}

          {events.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <h2>Upcoming events</h2>
              {events.map((event) => (
                <div key={event.id} className="campaign-card" style={{ padding: 16, marginTop: 10 }}>
                  <h3 style={{ margin: "0 0 4px" }}>{event.title}</h3>
                  <p className="muted">
                    {new Date(event.starts_at).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })}
                    {event.location ? ` · ${event.location}` : ""}
                  </p>
                  <Link className="button small" href={`/events/${event.id}/tickets`}>
                    Buy tickets
                  </Link>
                </div>
              ))}
            </div>
          )}

          {updates.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <h2>Updates</h2>
              {updates.map((update) => (
                <div key={update.id} style={{ borderTop: "1px solid var(--line)", padding: "16px 0" }}>
                  <p className="muted">
                    {update.author_name ?? "Organizer"} · {new Date(update.created_at).toLocaleDateString()}
                  </p>
                  <p style={{ whiteSpace: "pre-wrap" }}>{update.body}</p>
                </div>
              ))}
            </div>
          )}
        </section>
        <aside className="donate-panel">
          <h2>Help this campaign</h2>
          <FeeTransparencyBanner compact />
          <a className="button" href={`/donate/${campaign.id}`}>
            Donate
          </a>
          <ShareCampaignButtons title={campaign.title} url={`${process.env.NEXT_PUBLIC_APP_URL || "https://benefitly-web.vercel.app"}/f/${campaign.slug}`} />
          <EmbedCodeBox
            title={campaign.title}
            embedUrl={`${process.env.NEXT_PUBLIC_APP_URL || "https://benefitly-web.vercel.app"}/f/${campaign.slug}/embed`}
          />
          <a className="share" href={`/f/${campaign.slug}/share`}>
            QR code &amp; NFC share kit
          </a>
          {session ? (
            <SaveCampaignButton campaignId={campaign.id} initiallySaved={initiallySaved} />
          ) : (
            <a className="share" href="/sign-in">
              Sign in to save
            </a>
          )}
          <a className="text-link" href={`/f/${campaign.slug}/report`} style={{ display: "block", marginTop: 16 }}>
            Report this campaign
          </a>
        </aside>
      </main>
    </>
  );
}
