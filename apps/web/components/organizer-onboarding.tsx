"use client";

import { useState } from "react";

export function OrganizerOnboarding() {
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function start() {
    setStatus("submitting");
    setErrorMessage("");
    const response = await fetch("/api/organizer/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ legalName: "Pending onboarding", country: "US", entityType: "individual", provider: "stripe_connect" }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus("error");
      setErrorMessage(body?.error?.message ?? "Payouts aren't configured on this server yet.");
      return;
    }
    window.location.href = body.data.onboardingUrl;
  }

  return (
    <div className="donate-panel">
      <h2>Set up payouts</h2>
      <p>Connect a payment account to receive funds raised on your campaigns.</p>
      <button className="button" onClick={start} disabled={status === "submitting"}>
        {status === "submitting" ? "Starting…" : "Connect a payment account"}
      </button>
      {status === "error" && <p className="muted">{errorMessage}</p>}
    </div>
  );
}
