"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import type { PlanUsage, SubscriptionPlan } from "@/lib/associations";

export function PlanUsagePanel({ orgId, usage, plans, canManage }: { orgId: string; usage: PlanUsage; plans: SubscriptionPlan[]; canManage: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState(usage.plan_tier);

  const atLimit = usage.member_limit != null && usage.member_count >= usage.member_limit;
  const nearLimit = usage.member_limit != null && !atLimit && usage.member_count >= usage.member_limit * 0.8;

  async function changePlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selected === usage.plan_tier) return;
    setStatus("submitting");
    setMessage("");
    const response = await fetch(`/api/organizations/${orgId}/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier: selected }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus("error");
      setMessage(body?.error?.message ?? "Could not change plan.");
      return;
    }
    setStatus("idle");
    router.refresh();
  }

  return (
    <div className="plan-usage-panel">
      <div>
        <p className="muted">
          <strong>{usage.plan_name}</strong> plan &middot; {usage.member_count}
          {usage.member_limit != null ? ` / ${usage.member_limit}` : ""} members
        </p>
        {usage.member_limit != null && (
          <div className="progress" aria-label={`${usage.member_count} of ${usage.member_limit} members used`}>
            <span style={{ width: `${Math.min(100, (usage.member_count / usage.member_limit) * 100)}%`, background: atLimit ? "#c0362c" : undefined }} />
          </div>
        )}
        {atLimit && (
          <p className="plan-limit-warning">
            You&apos;ve reached your plan&apos;s member limit. Upgrade below to add more members.
          </p>
        )}
        {nearLimit && !atLimit && <p className="muted">Approaching your plan&apos;s member limit.</p>}
      </div>

      {canManage && (
        <form className="search" onSubmit={changePlan} style={{ marginTop: 12 }}>
          <label htmlFor="plan-tier">Change plan</label>
          <select id="plan-tier" value={selected} onChange={(event) => setSelected(event.target.value)} style={{ minHeight: 44, borderRadius: 9, border: "1px solid var(--line)", padding: "0 12px" }}>
            {plans.map((plan) => (
              <option key={plan.tier} value={plan.tier}>
                {plan.name} {plan.monthly_price_cents != null ? `— $${(plan.monthly_price_cents / 100).toFixed(0)}/mo` : "— Custom"}
              </option>
            ))}
          </select>
          <button className="button small" type="submit" disabled={status === "submitting" || selected === usage.plan_tier}>
            {status === "submitting" ? "Saving…" : "Update plan"}
          </button>
          {status === "error" && <p className="muted">{message}</p>}
        </form>
      )}
      <p className="muted">
        <Link className="text-link" href="/product/pricing">
          Compare plans
        </Link>
      </p>
    </div>
  );
}
