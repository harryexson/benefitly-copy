"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RecordContributionButton({ orgId, memberId }: { orgId: string; memberId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "submitting">("idle");

  async function record() {
    const amountDollars = window.prompt("Amount (USD)");
    if (!amountDollars) return;
    const amount = Math.round(Number(amountDollars) * 100);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setStatus("submitting");
    const response = await fetch(`/api/organizations/${orgId}/members/${memberId}/contributions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, kind: "Dues", currency: "USD" }),
    });
    setStatus("idle");
    if (response.ok) router.refresh();
    else window.alert("Could not record contribution.");
  }

  return (
    <button className="button small" onClick={record} disabled={status === "submitting"}>
      Record dues payment
    </button>
  );
}
