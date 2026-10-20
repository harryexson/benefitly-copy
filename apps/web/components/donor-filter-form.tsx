"use client";

import type { OrgCampaignOption } from "@/lib/associations";

export function DonorFilterForm({
  campaigns,
  initial,
}: {
  campaigns: OrgCampaignOption[];
  initial: { from?: string; to?: string; min?: string; campaign?: string };
}) {
  return (
    <form className="search" style={{ flexWrap: "wrap" }} method="get">
      <label htmlFor="donor-from">From</label>
      <input id="donor-from" type="date" name="from" defaultValue={initial.from} />

      <label htmlFor="donor-to">To</label>
      <input id="donor-to" type="date" name="to" defaultValue={initial.to} />

      <label htmlFor="donor-min">Min total ($)</label>
      <input id="donor-min" type="number" min={0} name="min" defaultValue={initial.min} style={{ width: 100 }} />

      <label htmlFor="donor-campaign">Campaign</label>
      <select id="donor-campaign" name="campaign" defaultValue={initial.campaign ?? ""} style={{ minHeight: 48, borderRadius: 9, border: "1px solid var(--line)", padding: "0 12px" }}>
        <option value="">All campaigns</option>
        {campaigns.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
          </option>
        ))}
      </select>

      <button className="button small" type="submit">
        Apply filter
      </button>
    </form>
  );
}
