"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ManualCheckInForm({ campaignId, eventId }: { campaignId: string; eventId: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error" | "done">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!code.trim()) return;
    setStatus("submitting");
    setMessage("");
    const response = await fetch(`/api/campaigns/${campaignId}/events/${eventId}/checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim() }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus("error");
      setMessage(body?.error?.message ?? "Could not check in this ticket.");
      return;
    }
    setStatus("done");
    setMessage(`Checked in: ${body.data.attendee_name}`);
    setCode("");
    router.refresh();
  }

  return (
    <form className="search" onSubmit={onSubmit}>
      <label htmlFor="checkin-code">Ticket code</label>
      <input
        id="checkin-code"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="e.g. A1B2C3D4E5"
        style={{ fontFamily: "monospace", textTransform: "uppercase" }}
        autoFocus
      />
      <button className="button small" type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? "Checking in…" : "Check in"}
      </button>
      {message && <p className="muted" style={{ width: "100%" }}>{message}</p>}
    </form>
  );
}
