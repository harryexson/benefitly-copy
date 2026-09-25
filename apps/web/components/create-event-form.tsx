"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateEventForm({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    const form = new FormData(event.currentTarget);
    const startsAt = form.get("startsAt");
    const response = await fetch(`/api/organizations/${orgId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        location: form.get("location") || undefined,
        startsAt: startsAt ? new Date(startsAt as string).toISOString() : undefined,
        visibility: "members",
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus("error");
      setMessage(body?.error?.message ?? "Could not create event.");
      return;
    }
    setStatus("idle");
    (event.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="filter-row" style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
      <input name="title" placeholder="Event title" required style={{ minWidth: 200 }} />
      <input name="location" placeholder="Location" />
      <input name="startsAt" type="datetime-local" required />
      <button className="button small" type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? "Creating…" : "Create event"}
      </button>
      {status === "error" && <p className="muted">{message}</p>}
    </form>
  );
}
