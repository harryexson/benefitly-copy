"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SaveCampaignButton({ campaignId, initiallySaved }: { campaignId: string; initiallySaved: boolean }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initiallySaved);
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    const response = await fetch("/api/me/saved-campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId }),
    });
    setPending(false);
    if (!response.ok) return;
    const body = await response.json().catch(() => null);
    setSaved(Boolean(body?.data?.saved));
    router.refresh();
  }

  return (
    <button className="share" type="button" onClick={toggle} disabled={pending}>
      {saved ? "Saved to your giving plan" : "Save for later"}
    </button>
  );
}
