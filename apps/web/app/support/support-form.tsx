"use client";

import { useState } from "react";

export function SupportTicketForm() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");
    try {
      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subject, body }),
      });
      const json = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!response.ok) {
        setStatus("error");
        setMessage(json?.error?.message ?? "Could not send your request.");
        return;
      }
      setStatus("sent");
      setSubject("");
      setBody("");
      setMessage("Thanks. Your request is in the queue.");
    } catch {
      setStatus("error");
      setMessage("Network error. Try again.");
    }
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 560 }}>
      <label htmlFor="support-subject">Subject</label>
      <input id="support-subject" required minLength={3} maxLength={160} value={subject} onChange={(e) => setSubject(e.target.value)} />
      <label htmlFor="support-body">What happened?</label>
      <textarea id="support-body" required minLength={10} maxLength={5000} rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
      <button className="button" type="submit" disabled={status === "sending"}>{status === "sending" ? "Sending…" : "Send request"}</button>
      {message && <p role="status" className={status === "error" ? "muted" : undefined}>{message}</p>}
    </form>
  );
}
