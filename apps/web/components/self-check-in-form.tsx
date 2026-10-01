"use client";

import { useState } from "react";

type Result = { attendee_name: string; event_title: string; already_checked_in: boolean };

export function SelfCheckInForm({ initialCode }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode ?? "");
  const [status, setStatus] = useState<"idle" | "submitting" | "error" | "done">("idle");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!code.trim()) return;
    setStatus("submitting");
    setMessage("");
    const response = await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim() }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus("error");
      setMessage(body?.error?.message ?? "We couldn't find that ticket code.");
      return;
    }
    setStatus("done");
    setResult(body.data as Result);
  }

  if (status === "done" && result) {
    return (
      <div className="donate-panel" style={{ textAlign: "center" }}>
        <h2>{result.already_checked_in ? "Already checked in" : "You're checked in!"}</h2>
        <p>
          Welcome, <strong>{result.attendee_name}</strong>
        </p>
        <p className="muted">{result.event_title}</p>
      </div>
    );
  }

  return (
    <form className="donate-panel" onSubmit={onSubmit} style={{ maxWidth: 420 }}>
      <h2>Check in</h2>
      <label htmlFor="self-checkin-code">Enter your ticket code</label>
      <input
        id="self-checkin-code"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="From your confirmation email or text"
        style={{ fontFamily: "monospace", textTransform: "uppercase", fontSize: 18, textAlign: "center" }}
        autoFocus
      />
      <button className="button" type="submit" disabled={status === "submitting"} style={{ marginTop: 14 }}>
        {status === "submitting" ? "Checking in…" : "Check in"}
      </button>
      {status === "error" && <p className="muted">{message}</p>}
    </form>
  );
}
