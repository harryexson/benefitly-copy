import Link from "next/link";
import type { PlanUsage } from "@/lib/associations";

export function PlanUsagePanel({ orgSlug, usage, canManage }: { orgSlug: string; usage: PlanUsage; canManage: boolean }) {
  const atLimit = usage.member_limit != null && usage.member_count >= usage.member_limit;
  const nearLimit = usage.member_limit != null && !atLimit && usage.member_count >= usage.member_limit * 0.8;

  return (
    <section className="section" style={{ padding: "16px 0" }}>
      <p className="kicker">Plan</p>
      <p>
        <strong>{usage.plan_name}</strong> · {usage.member_count}
        {usage.member_limit != null ? ` of ${usage.member_limit}` : ""} members
      </p>
      {atLimit && <p role="status">You have reached this plan&apos;s member limit. Upgrade to add more members.</p>}
      {nearLimit && <p className="muted">You are close to this plan&apos;s member limit.</p>}
      {canManage && <Link href={`/org/${orgSlug}/billing`}>Manage plan &amp; billing</Link>}
    </section>
  );
}
