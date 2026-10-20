"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { GivingPlan, CharityDirectoryEntry } from "@/lib/donor";
import type { CampaignSummary } from "@benefitly/domain";

const cadenceLabels: Record<GivingPlan["cadence"], string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annually: "Annually",
};

const categoryLabels: Record<string, string> = {
  emergency: "Emergency",
  medical: "Medical",
  memorial: "Memorial",
  education: "Education",
  community: "Community",
  faith: "Faith",
  disaster: "Disaster",
};

export function GivingPlanManager({ plans, campaigns, charities }: { plans: GivingPlan[]; campaigns: CampaignSummary[]; charities: CharityDirectoryEntry[] }) {
  const router = useRouter();
  const [target, setTarget] = useState<"campaign" | "category" | "charity">("campaign");
  const [charityId, setCharityId] = useState(charities[0]?.id ?? "");
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? "");
  const [category, setCategory] = useState("community");
  const [amount, setAmount] = useState("");
  const [cadence, setCadence] = useState<GivingPlan["cadence"]>("monthly");
  const [annualGoal, setAnnualGoal] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const categories = Array.from(new Set(campaigns.map((c) => c.category)));

  async function createPlan(event: React.FormEvent) {
    event.preventDefault();
    const dollars = Number(amount);
    if (!Number.isFinite(dollars) || dollars <= 0) {
      setStatus("error");
      setMessage("Enter a giving amount greater than zero.");
      return;
    }
    setStatus("submitting");
    setMessage("");
    const response = await fetch("/api/me/giving-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId: target === "campaign" ? campaignId || undefined : undefined,
        category: target === "category" ? category : undefined,
        charityDirectoryId: target === "charity" ? charityId || undefined : undefined,
        amount: dollars,
        currency: "USD",
        cadence,
        annualGoal: annualGoal ? Number(annualGoal) : undefined,
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus("error");
      setMessage(body?.error?.message ?? "Could not create your giving plan.");
      return;
    }
    setAmount("");
    setAnnualGoal("");
    setStatus("idle");
    router.refresh();
  }

  async function changeStatus(planId: string, next: GivingPlan["status"]) {
    setPendingId(planId);
    const response = await fetch(`/api/me/giving-plans/${planId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setPendingId(null);
    if (response.ok) router.refresh();
  }

  return (
    <div>
      {plans.length === 0 && <p className="muted">You don&apos;t have a giving plan yet. Set one up below.</p>}
      {plans.length > 0 && (
        <ul className="gift-log" style={{ marginBottom: 20 }}>
          {plans.map((plan) => {
            const campaign = plan.campaign_id ? campaigns.find((c) => c.id === plan.campaign_id) : null;
            const charity = plan.charity_directory_id ? charities.find((c) => c.id === plan.charity_directory_id) : null;
            const targetLabel = campaign ? campaign.title : charity ? charity.name : categoryLabels[plan.category ?? ""] ?? plan.category;
            return (
              <li key={plan.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span>
                  <strong>${(plan.amount_cents / 100).toLocaleString()}</strong> {cadenceLabels[plan.cadence].toLowerCase()} to {targetLabel}
                  <span className="muted"> &middot; {plan.status}</span>
                  {charity && (
                    <span className="muted">
                      {" "}
                      &middot; <Link href={charity.website_url} target="_blank">give on their site</Link>
                    </span>
                  )}
                </span>
                <span style={{ display: "flex", gap: 8 }}>
                  {plan.status === "active" && (
                    <button className="share" type="button" disabled={pendingId === plan.id} onClick={() => changeStatus(plan.id, "paused")}>
                      Pause
                    </button>
                  )}
                  {plan.status === "paused" && (
                    <button className="share" type="button" disabled={pendingId === plan.id} onClick={() => changeStatus(plan.id, "active")}>
                      Resume
                    </button>
                  )}
                  {plan.status !== "cancelled" && (
                    <button className="share" type="button" disabled={pendingId === plan.id} onClick={() => changeStatus(plan.id, "cancelled")}>
                      Cancel
                    </button>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <form className="search" onSubmit={createPlan} style={{ flexWrap: "wrap" }}>
        <label htmlFor="plan-target">Give to</label>
        <select id="plan-target" value={target} onChange={(e) => setTarget(e.target.value as "campaign" | "category" | "charity")} style={{ minHeight: 48, borderRadius: 9, border: "1px solid var(--line)", padding: "0 12px" }}>
          <option value="campaign">A specific fundraiser</option>
          <option value="category">A cause category</option>
          <option value="charity">A charity from the marketplace</option>
        </select>

        {target === "campaign" && (
          <>
            <label htmlFor="plan-campaign">Fundraiser</label>
            <select id="plan-campaign" value={campaignId} onChange={(e) => setCampaignId(e.target.value)} style={{ minHeight: 48, borderRadius: 9, border: "1px solid var(--line)", padding: "0 12px" }}>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </>
        )}
        {target === "category" && (
          <>
            <label htmlFor="plan-category">Cause</label>
            <select id="plan-category" value={category} onChange={(e) => setCategory(e.target.value)} style={{ minHeight: 48, borderRadius: 9, border: "1px solid var(--line)", padding: "0 12px" }}>
              {(categories.length > 0 ? categories : Object.keys(categoryLabels)).map((c) => (
                <option key={c} value={c}>
                  {categoryLabels[c] ?? c}
                </option>
              ))}
            </select>
          </>
        )}
        {target === "charity" && (
          <>
            <label htmlFor="plan-charity">Charity</label>
            <select id="plan-charity" value={charityId} onChange={(e) => setCharityId(e.target.value)} style={{ minHeight: 48, borderRadius: 9, border: "1px solid var(--line)", padding: "0 12px" }}>
              {charities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </>
        )}

        <label htmlFor="plan-amount">Amount ($)</label>
        <input id="plan-amount" inputMode="decimal" placeholder="25" value={amount} onChange={(e) => setAmount(e.target.value)} />

        <label htmlFor="plan-cadence">How often</label>
        <select id="plan-cadence" value={cadence} onChange={(e) => setCadence(e.target.value as GivingPlan["cadence"])} style={{ minHeight: 48, borderRadius: 9, border: "1px solid var(--line)", padding: "0 12px" }}>
          {Object.entries(cadenceLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <label htmlFor="plan-goal">Annual goal ($, optional)</label>
        <input id="plan-goal" inputMode="decimal" placeholder="600" value={annualGoal} onChange={(e) => setAnnualGoal(e.target.value)} />

        <button className="button" type="submit" disabled={status === "submitting"}>
          {status === "submitting" ? "Saving…" : "Start giving plan"}
        </button>
      </form>
      {status === "error" && <p className="muted">{message}</p>}
    </div>
  );
}
