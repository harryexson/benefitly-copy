import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { MediaUploader } from "@/components/media-uploader";
import { UpdateComposer } from "@/components/update-composer";
import { ShareCampaignButtons } from "@/components/share-campaign-buttons";
import { InviteNetworkForm } from "@/components/invite-network-form";
import { getOwnedCampaignById, listCampaignDonors } from "@/lib/organizer";
import { listCampaignMedia, listCampaignUpdates } from "@/lib/campaigns";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Manage fundraiser" };

export default async function ManageCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  if (!session) {
    return (
      <>
        <SiteHeader />
        <main className="page">
          <h1>Sign in required</h1>
          <p>
            <Link href="/sign-in">Sign in</Link> to manage this fundraiser.
          </p>
        </main>
      </>
    );
  }

  const campaign = await getOwnedCampaignById(session.user.id, id).catch(() => null);
  if (!campaign) notFound();

  const [media, updates, donors] = await Promise.all([
    listCampaignMedia(campaign.id).catch(() => []),
    listCampaignUpdates(campaign.id).catch(() => []),
    listCampaignDonors(session.user.id, campaign.id).catch(() => []),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="page">
        <p className="kicker">Manage fundraiser</p>
        <h1>{campaign.title}</h1>
        <p className="muted">
          <Link href={`/f/${campaign.slug}`}>View public page</Link> · {campaign.status}
          {campaign.review_status ? ` · ${campaign.review_status}` : ""}
        </p>

        <section className="section" style={{ padding: "24px 0" }}>
          <h2>Share &amp; promote</h2>
          <ShareCampaignButtons title={campaign.title} url={`${process.env.NEXT_PUBLIC_APP_URL || "https://benefitly-web.vercel.app"}/f/${campaign.slug}`} />
          <p className="muted" style={{ marginTop: 10 }}>
            <Link href={`/f/${campaign.slug}/share`}>Get the QR code &amp; NFC share kit →</Link>
          </p>
          <div style={{ marginTop: 20 }}>
            <InviteNetworkForm campaignId={campaign.id} />
          </div>
        </section>

        <section className="section" style={{ padding: "24px 0" }}>
          <h2>Donors ({donors.length})</h2>
          {donors.length === 0 && <p className="muted">No donations yet.</p>}
          {donors.length > 0 && (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Donor</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {donors.map((donor) => (
                  <tr key={donor.id}>
                    <td>{donor.donor_name}</td>
                    <td>
                      ${(donor.gross_amount / 100).toLocaleString()} {donor.currency}
                    </td>
                    <td>{donor.status}</td>
                    <td>{new Date(donor.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="section" style={{ padding: "24px 0" }}>
          <h2>Photos &amp; video</h2>
          <MediaUploader campaignId={campaign.id} />
          <div className="filter-row" style={{ flexWrap: "wrap", marginTop: 14 }}>
            {media.map((item) =>
              item.media_type === "video" ? (
                <video key={item.id} src={item.storage_key} controls style={{ width: 180, height: 120, borderRadius: 10, objectFit: "cover" }} />
              ) : (
                <img key={item.id} src={item.storage_key} alt={item.alt_text ?? ""} style={{ width: 180, height: 120, borderRadius: 10, objectFit: "cover" }} />
              ),
            )}
            {media.length === 0 && <p className="muted">No photos or video yet.</p>}
          </div>
        </section>

        <section className="section" style={{ padding: "24px 0" }}>
          <h2>Post an update</h2>
          <UpdateComposer campaignId={campaign.id} />
          <div style={{ marginTop: 20 }}>
            {updates.map((update) => (
              <div key={update.id} style={{ borderTop: "1px solid var(--line)", padding: "12px 0" }}>
                <p className="muted">{new Date(update.created_at).toLocaleDateString()}</p>
                <p style={{ whiteSpace: "pre-wrap" }}>{update.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
