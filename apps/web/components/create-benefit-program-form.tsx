"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateBenefitProgramForm({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    const form = new FormData(event.currentTarget);
    const maxDollars = form.get("maximumAmount");
    const response = await fetch(`/api/organizations/${orgId}/benefit-programs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        description: form.get("description"),
        maximumAmount: maxDollars ? Math.round(Number(maxDollars) * 100) : undefined,
        waitingPeriodDays: 0,
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus("error");
      setMessage(body?.error?.message ?? "Could not create program.");
      return;
    }
    setStatus("idle");
    (event.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="filter-row" style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
      <input name="name" placeholder="Program name" required />
      <input name="description" placeholder="Description" required style={{ minWidth: 220 }} />
      <input name="maximumAmount" type="number" placeholder="Max (USD, optional)" />
      <button className="button small" type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? "Creating…" : "Create program"}
      </button>
      {status === "error" && <p className="muted">{message}</p>}
    </form>
  );
}
