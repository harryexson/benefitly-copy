"use client";

import { useState } from "react";

export function OrganizerOnboarding({
  organizationId,
  legalName,
  redirectTo,
  mandatory,
}: {
  organizationId?: string;
  legalName?: string;
  redirectTo?: string;
  mandatory?: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function start() {
    setStatus("submitting");
    setErrorMessage("");
    const response = await fetch("/api/organizer/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        legalName: legalName?.trim() || "Pending onboarding",
        country: "US",
        entityType: organizationId ? "business" : "individual",
        provider: "stripe_connect",
        organizationId,
        redirectTo,
      }),
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
      <h2>{mandatory ? "Set up payouts to continue" : "Set up payouts"}</h2>
      <p>
        {organizationId
          ? "Connect your organization's payment account with Stripe so donations and dues can reach it."
          : "Connect a payment account with Stripe to receive funds raised on your campaigns."}
        {mandatory && " This is a required step before you can continue -- it only takes a few minutes."}
      </p>
      <button className="button" onClick={start} disabled={status === "submitting"}>
        {status === "submitting" ? "Starting…" : "Connect a payment account"}
      </button>
      {status === "error" && <p className="muted">{errorMessage}</p>}
    </div>
  );
}
