"use client";

import { useState } from "react";

const reasons = [
  { value: "fraud", label: "Fraud or scam" },
  { value: "misuse_of_funds", label: "Misuse of funds" },
  { value: "inappropriate_content", label: "Inappropriate content" },
  { value: "impersonation", label: "Impersonation" },
  { value: "duplicate", label: "Duplicate campaign" },
  { value: "other", label: "Other" },
] as const;

export function ReportForm({ campaignId }: { campaignId: string }) {
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/campaigns/${campaignId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: form.get("reason"), details: form.get("details") || undefined }),
    });
    setStatus(response.ok ? "done" : "error");
  }

  if (status === "done") {
    return <p>Thanks for the report. Our trust and safety team will review this campaign.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="page" style={{ maxWidth: 480, padding: 0 }}>
      <label htmlFor="reason">Reason</label>
      <select id="reason" name="reason" required defaultValue="fraud">
        {reasons.map((reason) => (
          <option key={reason.value} value={reason.value}>
            {reason.label}
          </option>
        ))}
      </select>
      <label htmlFor="details">Details (optional)</label>
      <textarea id="details" name="details" rows={5} maxLength={2000} />
      <button className="button" type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? "Submitting…" : "Submit report"}
      </button>
      {status === "error" && <p className="muted">Something went wrong. Please try again.</p>}
    </form>
  );
}
