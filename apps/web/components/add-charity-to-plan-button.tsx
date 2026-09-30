"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddCharityToPlanButton({ charityId, charityName }: { charityId: string; charityName: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "open" | "submitting" | "done" | "error">("idle");
  const [amount, setAmount] = useState("25");
  const [cadence, setCadence] = useState<"weekly" | "monthly" | "quarterly" | "annually">("monthly");
  const [message, setMessage] = useState("");

  async function addToPlan(event: React.FormEvent) {
    event.preventDefault();
    const dollars = Number(amount);
    if (!Number.isFinite(dollars) || dollars <= 0) return;
    setStatus("submitting");
    const response = await fetch("/api/me/giving-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ charityDirectoryId: charityId, amount: dollars, currency: "USD", cadence }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus("error");
      setMessage(body?.error?.message ?? "Could not add this to your giving plan.");
      return;
    }
    setStatus("done");
    router.refresh();
  }

  if (status === "done") {
    return <span className="muted">Added to your giving plan</span>;
  }

  if (status === "open" || status === "submitting" || status === "error") {
    return (
      <form onSubmit={addToPlan} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <span className="muted">${" "}</span>
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{ width: 60, minHeight: 36, borderRadius: 9, border: "1px solid var(--line)", padding: "0 8px" }}
          aria-label={`Amount for ${charityName}`}
        />
        <select value={cadence} onChange={(e) => setCadence(e.target.value as typeof cadence)} style={{ minHeight: 36, borderRadius: 9, border: "1px solid var(--line)", padding: "0 8px" }}>
          <option value="weekly">weekly</option>
          <option value="monthly">monthly</option>
          <option value="quarterly">quarterly</option>
          <option value="annually">annually</option>
        </select>
        <button className="share" type="submit" disabled={status === "submitting"}>
          {status === "submitting" ? "Saving…" : "Add"}
        </button>
        {status === "error" && <span className="muted">{message}</span>}
      </form>
    );
  }

  return (
    <button className="share" type="button" onClick={() => setStatus("open")}>
      Add to my giving plan
    </button>
  );
}
