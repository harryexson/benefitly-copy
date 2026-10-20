"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateTicketTypeForm({ campaignId, eventId }: { campaignId: string; eventId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage("");
    const form = new FormData(event.currentTarget);
    const qty = form.get("quantityAvailable") as string;

    const response = await fetch(`/api/campaigns/${campaignId}/events/${eventId}/ticket-types`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        price: Number(form.get("price") || 0),
        currency: "USD",
        quantityAvailable: qty ? Number(qty) : undefined,
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus("error");
      setErrorMessage(body?.error?.message ?? "Could not add ticket type.");
      return;
    }
    setStatus("idle");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button className="share" type="button" onClick={() => setOpen(true)}>
        + Add ticket type
      </button>
    );
  }

  return (
    <form className="search" style={{ flexWrap: "wrap" }} onSubmit={onSubmit}>
      <label htmlFor="ticket-name">Ticket name</label>
      <input id="ticket-name" name="name" required maxLength={120} placeholder="General Admission" />
      <label htmlFor="ticket-price">Price ($, 0 for free)</label>
      <input id="ticket-price" name="price" type="number" min={0} step="0.01" required defaultValue={0} style={{ width: 100 }} />
      <label htmlFor="ticket-qty">Quantity available (optional)</label>
      <input id="ticket-qty" name="quantityAvailable" type="number" min={1} step={1} style={{ width: 100 }} />
      <button className="button small" type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? "Saving…" : "Add"}
      </button>
      <button className="share" type="button" onClick={() => setOpen(false)}>
        Cancel
      </button>
      {status === "error" && <p className="muted">{errorMessage}</p>}
    </form>
  );
}
