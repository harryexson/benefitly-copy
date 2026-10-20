import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { ShareCampaignButtons } from "@/components/share-campaign-buttons";
import { getPublishedCampaignBySlug } from "@/lib/campaigns";

export const dynamic = "force-dynamic";
export const metadata = { title: "Share kit" };

export default async function CampaignShareKitPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const campaign = await getPublishedCampaignBySlug(slug).catch(() => null);
  if (!campaign) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://benefitly-web.vercel.app";
  const campaignUrl = `${baseUrl}/f/${campaign.slug}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=480x480&data=${encodeURIComponent(campaignUrl)}`;

  return (
    <>
      <SiteHeader />
      <main className="page">
        <p className="kicker">Share kit</p>
        <h1>{campaign.title}</h1>
        <p className="muted">Everything you need to spread the word, in print or in person.</p>

        <section className="section" style={{ padding: "24px 0" }}>
          <h2>Share online</h2>
          <ShareCampaignButtons title={campaign.title} url={campaignUrl} />
          <p className="search" style={{ marginTop: 16 }}>
            <input readOnly value={campaignUrl} style={{ flex: 1 }} onFocus={(e) => e.currentTarget.select()} />
          </p>
        </section>

        <section className="section" style={{ padding: "24px 0" }}>
          <h2>QR code</h2>
          <p className="muted">Print it on a flyer, table tent, or poster — scanning it opens this fundraiser directly.</p>
          <img src={qrUrl} alt={`QR code linking to ${campaign.title}`} width={240} height={240} style={{ borderRadius: 12, border: "1px solid var(--line)" }} />
          <p style={{ marginTop: 10 }}>
            <a className="button small" href={qrUrl} download={`${campaign.slug}-qr-code.png`}>
              Download QR code
            </a>
          </p>
        </section>

        <section className="section" style={{ padding: "24px 0 56px" }}>
          <h2>NFC tags</h2>
          <p className="muted">
            For a tap-to-donate experience at an in-person event or on a physical collection box, write this
            fundraiser&apos;s link to a blank NFC tag (available cheaply from most electronics retailers). Benefitly
            doesn&apos;t manufacture or ship physical NFC hardware, but any phone can program one:
          </p>
          <ol>
            <li>Buy a few blank, writable NFC stickers or cards (NTAG213/215/216 are the common, inexpensive ones).</li>
            <li>
              Install a free NFC-writing app on your phone (e.g. &quot;NFC Tools&quot; on iOS/Android).
            </li>
            <li>
              Choose &quot;Write&quot; → &quot;Add a record&quot; → &quot;URL / URI&quot;, paste the link below, and
              tap the blank tag to your phone to write it.
            </li>
            <li>Stick the tag anywhere supporters can tap their phone to it — a table, a flyer, a donation jar.</li>
          </ol>
          <p className="search">
            <input readOnly value={campaignUrl} style={{ flex: 1 }} onFocus={(e) => e.currentTarget.select()} />
          </p>
        </section>
      </main>
    </>
  );
}
