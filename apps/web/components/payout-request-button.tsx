"use client";

import { useState } from "react";

export function PayoutRequestButton({ campaignId, paymentAccountId, amount, currency }: { campaignId: string; paymentAccountId: string; amount: number; currency: string }) {
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function request() {
    setStatus("submitting");
    const response = await fetch("/api/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, paymentAccountId, amount, currency, idempotencyKey: crypto.randomUUID() }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus("error");
      setMessage(body?.error?.message ?? "Payout request failed.");
      return;
    }
    setStatus("done");
    setMessage(`Payout requested (${body.data.status}).`);
  }

  if (status === "done") return <p className="muted">{message}</p>;

  return (
    <div>
      <button className="button small" onClick={request} disabled={status === "submitting" || amount <= 0}>
        {status === "submitting" ? "Requesting…" : `Request payout of $${(amount / 100).toLocaleString()}`}
      </button>
      {status === "error" && <p className="muted">{message}</p>}
    </div>
  );
}
