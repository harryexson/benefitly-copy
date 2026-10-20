"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PayoutApproveButton({ payoutId }: { payoutId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState("");

  async function approve() {
    setStatus("submitting");
    const response = await fetch(`/api/admin/payouts/${payoutId}/approve`, { method: "POST" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus("error");
      setMessage(body?.error?.message ?? "Payout could not be approved.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <button className="button small" onClick={approve} disabled={status === "submitting"}>
        {status === "submitting" ? "Sending…" : "Approve & send payout"}
      </button>
      {status === "error" && <p className="muted">{message}</p>}
    </div>
  );
}
