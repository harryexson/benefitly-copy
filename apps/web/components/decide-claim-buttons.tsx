"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DecideClaimButtons({ orgId, claimId }: { orgId: string; claimId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<"approved" | "denied" | null>(null);

  async function decide(decision: "approved" | "denied") {
    setPending(decision);
    const response = await fetch(`/api/organizations/${orgId}/benefit-claims/${claimId}/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    setPending(null);
    if (response.ok) router.refresh();
    else window.alert("Could not decide claim.");
  }

  return (
    <div className="filter-row">
      <button onClick={() => decide("approved")} disabled={pending !== null}>
        {pending === "approved" ? "…" : "Approve"}
      </button>
      <button onClick={() => decide("denied")} disabled={pending !== null}>
        {pending === "denied" ? "…" : "Deny"}
      </button>
    </div>
  );
}
