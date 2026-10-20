"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SubscriptionPlan } from "@/lib/associations";

export function AdminOrgPlanSelect({ orgId, currentTier, plans }: { orgId: string; currentTier: string; plans: SubscriptionPlan[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState(currentTier);
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState("");

  async function change() {
    if (selected === currentTier) return;
    setStatus("submitting");
    setMessage("");
    const response = await fetch(`/api/admin/organizations/${orgId}/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier: selected }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus("error");
      setMessage(body?.error?.message ?? "Could not change plan.");
      return;
    }
    setStatus("idle");
    router.refresh();
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <select value={selected} onChange={(e) => setSelected(e.target.value)} style={{ minHeight: 36, borderRadius: 9, border: "1px solid var(--line)", padding: "0 10px" }}>
        {plans.map((plan) => (
          <option key={plan.tier} value={plan.tier}>
            {plan.name}
          </option>
        ))}
      </select>
      <button className="share" type="button" onClick={change} disabled={status === "submitting" || selected === currentTier}>
        {status === "submitting" ? "Saving…" : "Set plan"}
      </button>
      {status === "error" && <span className="muted">{message}</span>}
    </div>
  );
}
