"use client";

import { useState } from "react";

type Ticket = { id: string; subject: string; body: string; status: string; resolution_note: string | null; created_at: string };

export function SupportQueueRow({ ticket }: { ticket: Ticket }) {
  const [status, setStatus] = useState(ticket.status);
  const [note, setNote] = useState(ticket.resolution_note ?? "");
  const [message, setMessage] = useState("");

  async function save() {
    setMessage("");
    const response = await fetch(`/api/admin/support/tickets/${ticket.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status, note: note || null }),
    });
    const json = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    setMessage(response.ok ? "Saved." : json?.error?.message ?? "Could not save.");
  }

  return (
    <li className="section" style={{ padding: "16px 0", borderBottom: "1px solid var(--line)" }}>
      <strong>{ticket.subject}</strong> · {new Date(ticket.created_at).toLocaleString()}
      <p>{ticket.body}</p>
      <label htmlFor={`status-${ticket.id}`}>Status</label>
      <select id={`status-${ticket.id}`} value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="open">Open</option>
        <option value="in_progress">In progress</option>
        <option value="resolved">Resolved</option>
        <option value="closed">Closed</option>
      </select>
      <label htmlFor={`note-${ticket.id}`}>Resolution note (shown to the requester)</label>
      <textarea id={`note-${ticket.id}`} rows={2} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
      <button className="button small" type="button" onClick={save}>Save</button>
      {message && <span role="status" className="muted"> {message}</span>}
    </li>
  );
}
