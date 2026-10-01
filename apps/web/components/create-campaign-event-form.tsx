"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateCampaignEventForm({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage("");
    const form = new FormData(event.currentTarget);
    const date = form.get("date") as string;
    const time = form.get("time") as string;
    const startsAt = new Date(`${date}T${time || "18:00"}`).toISOString();

    const response = await fetch(`/api/campaigns/${campaignId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        description: form.get("description") || undefined,
        startsAt,
        location: form.get("location") || undefined,
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus("error");
      setErrorMessage(body?.error?.message ?? "Could not create event.");
      return;
    }
    setStatus("idle");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button className="button small" type="button" onClick={() => setOpen(true)}>
        + Add an event (banquet, dinner, luncheon…)
      </button>
    );
  }

  return (
    <form className="search" style={{ flexDirection: "column", alignItems: "stretch" }} onSubmit={onSubmit}>
      <label htmlFor="event-title">Event name</label>
      <input id="event-title" name="title" required minLength={2} maxLength={160} placeholder="Annual Fundraising Banquet" />
      <label htmlFor="event-description">Description (optional)</label>
      <textarea id="event-description" name="description" rows={3} style={{ border: "1px solid var(--line)", borderRadius: 9, padding: 12, fontFamily: "inherit" }} />
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label htmlFor="event-date">Date</label>
          <input id="event-date" name="date" type="date" required />
        </div>
        <div style={{ flex: 1 }}>
          <label htmlFor="event-time">Time</label>
          <input id="event-time" name="time" type="time" defaultValue="18:00" />
        </div>
      </div>
      <label htmlFor="event-location">Location (optional)</label>
      <input id="event-location" name="location" maxLength={200} placeholder="Community Hall, 123 Main St" />
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button className="button small" type="submit" disabled={status === "submitting"}>
          {status === "submitting" ? "Creating…" : "Create event"}
        </button>
        <button className="share" type="button" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      {status === "error" && <p className="muted">{errorMessage}</p>}
    </form>
  );
}
