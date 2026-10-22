"use client";

import { useState } from "react";

export function BillingActions({ orgId, planTier, canOpenPortal }: { orgId: string; planTier: string; canOpenPortal: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function redirectTo(path: string, body: unknown, key: string) {
    setBusy(key);
    setMessage("");
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body ?? {}),
      });
      const json = (await response.json().catch(() => null)) as { data?: { url: string }; error?: { message?: string } } | null;
      if (!response.ok || !json?.data?.url) {
        setMessage(json?.error?.message ?? "Billing is unavailable right now. Try again shortly.");
        setBusy(null);
        return;
      }
      window.location.href = json.data.url;
    } catch {
      setMessage("Network error. Try again.");
      setBusy(null);
    }
  }

  const paidTiers = ["starter", "growth", "scale"] as const;
  const label = (tier: string) => tier.charAt(0).toUpperCase() + tier.slice(1);
  return (
    <div>
      {paidTiers.map((tier) => (
        <div key={tier} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <button type="button" className="button small" disabled={busy !== null || planTier === tier}
            onClick={() => redirectTo(`/api/organizations/${orgId}/billing/checkout`, { tier, interval: "monthly" }, `${tier}-monthly`)}>
            {busy === `${tier}-monthly` ? "Opening…" : `${label(tier)} monthly`}
          </button>
          <button type="button" className="button small" disabled={busy !== null || planTier === tier}
            onClick={() => redirectTo(`/api/organizations/${orgId}/billing/checkout`, { tier, interval: "annual" }, `${tier}-annual`)}>
            {busy === `${tier}-annual` ? "Opening…" : `${label(tier)} annual`}
          </button>
        </div>
      ))}
      {canOpenPortal && (
        <button type="button" className="button small" disabled={busy !== null} onClick={() => redirectTo(`/api/organizations/${orgId}/billing/portal`, {}, "portal")}>
          {busy === "portal" ? "Opening…" : "Manage billing, invoices and cancellation"}
        </button>
      )}
      {message && <p role="status" className="muted">{message}</p>}
    </div>
  );
}
