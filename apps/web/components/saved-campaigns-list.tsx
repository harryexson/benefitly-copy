"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CampaignSummary } from "@benefitly/domain";

export function SavedCampaignsList({ campaigns }: { campaigns: CampaignSummary[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function unsave(campaignId: string) {
    setPendingId(campaignId);
    const response = await fetch("/api/me/saved-campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId }),
    });
    setPendingId(null);
    if (response.ok) router.refresh();
  }

  if (campaigns.length === 0) {
    return (
      <p className="muted">
        No saved fundraisers yet &mdash; save one from its{" "}
        <a href="/discover">discover</a> page to track it here.
      </p>
    );
  }

  return (
    <div className="campaign-grid">
      {campaigns.map((campaign) => (
        <article className="campaign-card" key={campaign.id}>
          <img src={campaign.image} alt="" />
          <div className="campaign-copy">
            <h3>{campaign.title}</h3>
            <p className="muted">Organized by {campaign.organizer}</p>
            <div className="giving-card-actions">
              <a className="button small" href={`/f/${campaign.slug}`}>
                View &amp; donate
              </a>
              <button className="share" type="button" disabled={pendingId === campaign.id} onClick={() => unsave(campaign.id)}>
                Remove
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
