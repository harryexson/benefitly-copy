"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const categories = [
  { value: "emergency", label: "Emergency" },
  { value: "medical", label: "Medical" },
  { value: "memorial", label: "Memorial" },
  { value: "education", label: "Education" },
  { value: "community", label: "Community" },
  { value: "faith", label: "Faith" },
  { value: "disaster", label: "Disaster" },
] as const;

export function CreateCampaignForm() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage("");
    const form = new FormData(event.currentTarget);
    const goalDollars = Number(form.get("goalAmount") || 0);

    const response = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        story: form.get("story"),
        category: form.get("category"),
        location: form.get("location") || undefined,
        currency: "USD",
        goalAmount: Math.round(goalDollars * 100),
        beneficiary: { name: form.get("beneficiaryName"), relationship: form.get("beneficiaryRelationship") || undefined },
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus("error");
      setErrorMessage(body?.error?.message ?? "Something went wrong. Please try again.");
      return;
    }
    router.push(`/dashboard?created=${body.data.id}`);
  }

  return (
    <form className="donate-panel" onSubmit={onSubmit} style={{ maxWidth: 640 }}>
      <label htmlFor="title">Campaign title</label>
      <input id="title" name="title" required minLength={5} maxLength={160} placeholder="Help Harbor House reopen its kitchen" />

      <label htmlFor="category">Category</label>
      <select id="category" name="category" required defaultValue="community">
        {categories.map((category) => (
          <option key={category.value} value={category.value}>
            {category.label}
          </option>
        ))}
      </select>

      <label htmlFor="location">Location (optional)</label>
      <input id="location" name="location" maxLength={160} placeholder="City, State" />

      <label htmlFor="goalAmount">Goal (USD)</label>
      <input id="goalAmount" name="goalAmount" type="number" min={1} step={1} required placeholder="5000" />

      <label htmlFor="story">Tell your story</label>
      <textarea id="story" name="story" required minLength={50} maxLength={20000} rows={10} />

      <label htmlFor="beneficiaryName">Who does this fundraiser benefit?</label>
      <input id="beneficiaryName" name="beneficiaryName" required minLength={2} maxLength={160} />

      <label htmlFor="beneficiaryRelationship">Your relationship to them (optional)</label>
      <input id="beneficiaryRelationship" name="beneficiaryRelationship" maxLength={80} placeholder="Myself, family member, friend…" />

      <p className="muted">Every campaign is reviewed by our team before it goes live -- usually within one business day.</p>

      <button className="button" type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? "Submitting…" : "Submit for review"}
      </button>
      {status === "error" && <p className="muted">{errorMessage}</p>}
    </form>
  );
}
