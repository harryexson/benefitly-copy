"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function UpdateComposer({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    const response = await fetch(`/api/campaigns/${campaignId}/updates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const responseBody = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus("error");
      setMessage(responseBody?.error?.message ?? "Could not post update.");
      return;
    }
    setBody("");
    setStatus("idle");
    router.refresh();
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 8, marginTop: 8 }}>
      <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Share progress with your supporters…" rows={4} maxLength={5000} required />
      <button className="button small" type="submit" disabled={status === "submitting"} style={{ justifySelf: "start" }}>
        {status === "submitting" ? "Posting…" : "Post update"}
      </button>
      {status === "error" && <p className="muted">{message}</p>}
    </form>
  );
}
