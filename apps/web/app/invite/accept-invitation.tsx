"use client";

import { useState } from "react";

export function AcceptInvitation({ token }: { token: string }) {
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function accept() {
    setStatus("working");
    setMessage("");
    try {
      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token }),
      });
      const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (res.ok) {
        setStatus("done");
        setMessage("You have joined the organization.");
      } else {
        setStatus("error");
        setMessage(json?.error?.message ?? "This invitation could not be accepted.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Try again.");
    }
  }

  return (
    <div>
      {status !== "done" && (
        <button type="button" onClick={accept} disabled={status === "working"}>
          {status === "working" ? "Joining…" : "Accept invitation"}
        </button>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
