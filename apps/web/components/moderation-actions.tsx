"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Action = "approve" | "reject" | "request_changes" | "pause" | "resume" | "remove" | "restore";

export function ModerationActions({ campaignId, reportId, actions }: { campaignId: string; reportId?: string; actions: Action[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<Action | null>(null);

  async function act(action: Action) {
    setPending(action);
    const reason = window.prompt(`Optional note for "${action}"`) || undefined;
    const response = await fetch("/api/admin/moderation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, reportId, action, reason }),
    });
    setPending(null);
    if (response.ok) router.refresh();
    else window.alert("That action failed. You may not have admin access.");
  }

  const labels: Record<Action, string> = {
    approve: "Approve",
    reject: "Reject",
    request_changes: "Request changes",
    pause: "Pause",
    resume: "Resume",
    remove: "Remove",
    restore: "Restore",
  };

  return (
    <div className="filter-row">
      {actions.map((action) => (
        <button key={action} onClick={() => act(action)} disabled={pending === action}>
          {pending === action ? "…" : labels[action]}
        </button>
      ))}
    </div>
  );
}
