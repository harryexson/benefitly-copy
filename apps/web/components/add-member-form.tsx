"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddMemberForm({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/organizations/${orgId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberNumber: form.get("memberNumber"),
        membershipLevel: form.get("membershipLevel") || undefined,
        contact: { name: form.get("name") || undefined, email: form.get("email") || undefined },
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus("error");
      setMessage(body?.error?.message ?? "Could not add member.");
      return;
    }
    setStatus("idle");
    (event.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="filter-row" style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
      <input name="memberNumber" placeholder="Member #" required style={{ maxWidth: 120 }} />
      <input name="name" placeholder="Name" />
      <input name="email" type="email" placeholder="Email" />
      <input name="membershipLevel" placeholder="Level (optional)" />
      <button className="button small" type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? "Adding…" : "Add member"}
      </button>
      {status === "error" && <p className="muted">{message}</p>}
    </form>
  );
}
