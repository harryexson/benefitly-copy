"use client";

import { useState } from "react";

function splitRecipients(raw: string): string[] {
  return Array.from(new Set(raw.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)));
}

export function InviteNetworkForm({ campaignId }: { campaignId: string }) {
  const [emails, setEmails] = useState("");
  const [note, setNote] = useState("");
  const [phones, setPhones] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "error">("idle");
  const [smsStatus, setSmsStatus] = useState<"idle" | "sending" | "error">("idle");
  const [emailResult, setEmailResult] = useState("");
  const [smsResult, setSmsResult] = useState("");

  async function sendEmails(event: React.FormEvent) {
    event.preventDefault();
    const recipients = splitRecipients(emails);
    if (recipients.length === 0) return;
    setEmailStatus("sending");
    setEmailResult("");
    const response = await fetch(`/api/campaigns/${campaignId}/share/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipients, note: note || undefined }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setEmailStatus("error");
      setEmailResult(body?.error?.message ?? "Could not send invitations.");
      return;
    }
    setEmailStatus("idle");
    setEmailResult(`Sent to ${body.data.sent} ${body.data.sent === 1 ? "person" : "people"}${body.data.failed ? `, ${body.data.failed} failed` : ""}.`);
    setEmails("");
  }

  async function sendTexts(event: React.FormEvent) {
    event.preventDefault();
    const recipients = splitRecipients(phones);
    if (recipients.length === 0) return;
    setSmsStatus("sending");
    setSmsResult("");
    const response = await fetch(`/api/campaigns/${campaignId}/share/sms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipients }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setSmsStatus("error");
      setSmsResult(body?.error?.message ?? "Could not send texts.");
      return;
    }
    setSmsStatus("idle");
    setSmsResult(`Sent to ${body.data.sent} ${body.data.sent === 1 ? "person" : "people"}${body.data.failed ? `, ${body.data.failed} failed` : ""}.`);
    setPhones("");
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <form className="search" style={{ flexDirection: "column", alignItems: "stretch" }} onSubmit={sendEmails}>
        <label htmlFor="invite-emails">Invite by email (one per line or comma-separated)</label>
        <textarea
          id="invite-emails"
          rows={3}
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          placeholder="friend@example.com, family@example.com"
          style={{ border: "1px solid var(--line)", borderRadius: 9, padding: 12, fontFamily: "inherit" }}
        />
        <label htmlFor="invite-note">Personal note (optional)</label>
        <input id="invite-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="I'd really appreciate your support!" />
        <button className="button small" type="submit" disabled={emailStatus === "sending"} style={{ alignSelf: "start" }}>
          {emailStatus === "sending" ? "Sending…" : "Send email invitations"}
        </button>
        {emailResult && <p className="muted">{emailResult}</p>}
      </form>

      <form className="search" style={{ flexDirection: "column", alignItems: "stretch" }} onSubmit={sendTexts}>
        <label htmlFor="invite-phones">Invite by text message (one per line or comma-separated)</label>
        <textarea
          id="invite-phones"
          rows={3}
          value={phones}
          onChange={(e) => setPhones(e.target.value)}
          placeholder="+15551234567"
          style={{ border: "1px solid var(--line)", borderRadius: 9, padding: 12, fontFamily: "inherit" }}
        />
        <button className="button small" type="submit" disabled={smsStatus === "sending"} style={{ alignSelf: "start" }}>
          {smsStatus === "sending" ? "Sending…" : "Send text invitations"}
        </button>
        {smsResult && <p className="muted">{smsResult}</p>}
      </form>
    </div>
  );
}
