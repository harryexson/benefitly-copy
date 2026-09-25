"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BenefitProgram, Member } from "@/lib/associations";

export function SubmitClaimForm({ orgId, programs, members }: { orgId: string; programs: BenefitProgram[]; members: Member[] }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState("");

  if (programs.length === 0 || members.length === 0) {
    return <p className="muted">Add a member and a benefit program before submitting a claim.</p>;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    const form = new FormData(event.currentTarget);
    const amountDollars = Number(form.get("requestedAmount") || 0);
    const response = await fetch(`/api/organizations/${orgId}/benefit-claims`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        programId: form.get("programId"),
        memberId: form.get("memberId"),
        requestedAmount: Math.round(amountDollars * 100),
        reason: form.get("reason"),
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus("error");
      setMessage(body?.error?.message ?? "Could not submit claim.");
      return;
    }
    setStatus("idle");
    (event.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="filter-row" style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
      <select name="programId" required defaultValue="">
        <option value="" disabled>
          Program
        </option>
        {programs.map((program) => (
          <option key={program.id} value={program.id}>
            {program.name}
          </option>
        ))}
      </select>
      <select name="memberId" required defaultValue="">
        <option value="" disabled>
          Member
        </option>
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.member_number}
          </option>
        ))}
      </select>
      <input name="requestedAmount" type="number" placeholder="Amount (USD)" required />
      <input name="reason" placeholder="Reason" required style={{ minWidth: 220 }} />
      <button className="button small" type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? "Submitting…" : "Submit claim"}
      </button>
      {status === "error" && <p className="muted">{message}</p>}
    </form>
  );
}
