"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RegisterEventButton({ orgId, eventId, memberId }: { orgId: string; eventId: string; memberId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "submitting">("idle");

  async function register() {
    setStatus("submitting");
    const response = await fetch(`/api/organizations/${orgId}/events/${eventId}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });
    setStatus("idle");
    if (response.ok) router.refresh();
    else window.alert("Could not register for this event.");
  }

  return (
    <button className="button small" onClick={register} disabled={status === "submitting"}>
      {status === "submitting" ? "Registering…" : "Register"}
    </button>
  );
}
