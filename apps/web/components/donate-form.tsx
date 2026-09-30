"use client";

import { useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe-client";

// Duplicated from @benefitly/payments/src/fees.ts rather than imported: that package's root
// export pulls in the Stripe/Adyen server SDKs, which must never reach a client bundle.
const SUGGESTED_CONTRIBUTION_RATES = [0, 0.1, 0.15, 0.18] as const;
function suggestedContribution(donationAmount: number, rate: number): number {
  return Math.round(donationAmount * rate);
}

type Result = {
  donationId: string;
  provider: string;
  status: string;
  clientSecret?: string;
  redirectUrl?: string;
  grossCharge: number;
  netToCampaign: number;
  platformContribution: number;
  currency: string;
};

const presetAmounts = [2500, 5000, 10000, 25000];

export function DonateForm({ campaignId, currency }: { campaignId: string; currency: string }) {
  const [amount, setAmount] = useState(5000);
  const [contributionRate, setContributionRate] = useState<number>(0.15);
  const [donorEmail, setDonorEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "ready-to-pay" | "paid" | "error">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const contribution = suggestedContribution(amount, contributionRate);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage("");
    const response = await fetch("/api/donations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId,
        amount,
        currency,
        platformContribution: contribution,
        idempotencyKey: crypto.randomUUID(),
        donorEmail: donorEmail || undefined,
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus("error");
      setErrorMessage(body?.error?.message ?? "Something went wrong. Please try again.");
      return;
    }
    const data = body.data as Result;
    setResult(data);
    setStatus(data.provider === "stripe_connect" && data.clientSecret ? "ready-to-pay" : "paid");
  }

  if (status === "paid" && result) {
    return (
      <div className="donate-panel">
        <h2>Thank you</h2>
        <p>
          Charging ${(result.grossCharge / 100).toLocaleString()} {result.currency} — ${(result.netToCampaign / 100).toLocaleString()} to the campaign
          {result.platformContribution > 0 ? ` and $${(result.platformContribution / 100).toLocaleString()} as your optional contribution to Benefitly.` : "."}
        </p>
        {result.provider === "stripe_connect" ? (
          <p className="muted">Your payment was received. A receipt is on its way, and this gift will appear in your donation history shortly.</p>
        ) : (
          <p className="muted">
            Provider: {result.provider}. This demo stops before entering card details — a production build would mount the Adyen Drop-in with this
            sessionData here to finish payment.
          </p>
        )}
      </div>
    );
  }

  if (status === "ready-to-pay" && result?.clientSecret) {
    return (
      <div className="donate-panel">
        <h2>Enter payment details</h2>
        <p className="muted">
          Charging ${(result.grossCharge / 100).toLocaleString()} {result.currency} today.
        </p>
        <Elements stripe={getStripe()} options={{ clientSecret: result.clientSecret }}>
          <StripePaymentStep onSuccess={() => setStatus("paid")} onError={(message) => setErrorMessage(message)} />
        </Elements>
        {errorMessage && <p className="muted">{errorMessage}</p>}
      </div>
    );
  }

  return (
    <form className="donate-panel" onSubmit={onSubmit}>
      <h2>Choose an amount</h2>
      <div className="filter-row" role="group" aria-label="Suggested amounts">
        {presetAmounts.map((preset) => (
          <button type="button" key={preset} className={amount === preset ? "active" : undefined} onClick={() => setAmount(preset)}>
            ${(preset / 100).toLocaleString()}
          </button>
        ))}
      </div>
      <label htmlFor="amount">Custom amount (USD)</label>
      <input
        id="amount"
        type="number"
        min={1}
        step={1}
        value={(amount / 100).toString()}
        onChange={(event) => setAmount(Math.max(100, Math.round(Number(event.target.value || 0) * 100)))}
      />

      <fieldset style={{ border: "none", padding: 0, margin: "16px 0" }}>
        <legend>Add an optional contribution to keep Benefitly free</legend>
        {SUGGESTED_CONTRIBUTION_RATES.map((rate) => (
          <label key={rate} style={{ display: "block" }}>
            <input type="radio" name="rate" checked={contributionRate === rate} onChange={() => setContributionRate(rate)} />{" "}
            {rate === 0 ? "No thanks" : `${Math.round(rate * 100)}% ($${(suggestedContribution(amount, rate) / 100).toFixed(2)})`}
          </label>
        ))}
      </fieldset>

      <label htmlFor="donorEmail">Email (for your receipt)</label>
      <input id="donorEmail" type="email" value={donorEmail} onChange={(event) => setDonorEmail(event.target.value)} placeholder="you@example.com" />

      <p className="amount">
        Total today: <strong>${((amount + contribution) / 100).toLocaleString()}</strong>
      </p>

      <button className="button" type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? "Processing…" : "Donate"}
      </button>
      {status === "error" && <p className="muted">{errorMessage}</p>}
    </form>
  );
}

function StripePaymentStep({ onSuccess, onError }: { onSuccess: () => void; onError: (message: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  async function pay(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    onError("");
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      // Most test/real cards resolve inline; a redirect-based method (if the account has any
      // enabled) falls back to return_url, which reloads this same donate page -- the page itself
      // doesn't inspect the returned payment_intent query param, since Stripe's own webhook (not
      // this client redirect) is the source of truth for settling the donation server-side.
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });
    setSubmitting(false);
    if (error) {
      onError(error.message ?? "Payment could not be completed. Please try a different payment method.");
      return;
    }
    if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "processing") {
      onSuccess();
    }
  }

  return (
    <form onSubmit={pay}>
      <PaymentElement />
      <button className="button" type="submit" disabled={!stripe || submitting} style={{ marginTop: 16 }}>
        {submitting ? "Processing…" : "Pay now"}
      </button>
    </form>
  );
}
