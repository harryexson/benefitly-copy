"use client";

import { useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { getStripeForAccount } from "@/lib/stripe-client";

type Started = { memberId: string; clientSecret: string; stripeAccountId: string };

export function DuesPayment({ memberId, amount, currency, label }: { memberId: string; amount: number; currency: string; label: string }) {
  const [started, setStarted] = useState<Started | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function start() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/me/members/${memberId}/dues`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amount, currency, contributionType: "Annual dues", idempotencyKey: crypto.randomUUID() }),
      });
      const json = (await response.json().catch(() => null)) as { data?: { clientSecret?: string; stripeAccountId?: string }; error?: { message?: string } } | null;
      if (!response.ok || !json?.data?.clientSecret || !json.data.stripeAccountId) {
        setMessage(json?.error?.message ?? "Dues payment is not available right now.");
        return;
      }
      setStarted({ memberId, clientSecret: json.data.clientSecret, stripeAccountId: json.data.stripeAccountId });
    } catch {
      setMessage("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (started) {
    return (
      <Elements stripe={getStripeForAccount(started.stripeAccountId)} options={{ clientSecret: started.clientSecret }}>
        <DuesPaymentStep label={label} />
      </Elements>
    );
  }

  return (
    <div>
      <p>Dues due: <strong>{label}</strong></p>
      <button type="button" className="button small" disabled={busy} onClick={start}>{busy ? "Starting…" : `Pay ${label}`}</button>
      {message && <p role="status" className="muted">{message}</p>}
    </div>
  );
}

function DuesPaymentStep({ label }: { label: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [status, setStatus] = useState<"idle" | "paying" | "paid" | "error">("idle");
  const [message, setMessage] = useState("");

  async function pay(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stripe || !elements) return;
    setStatus("paying");
    const { error } = await stripe.confirmPayment({ elements, redirect: "if_required" });
    if (error) {
      setStatus("error");
      setMessage(error.message ?? "Payment failed. Try again.");
      return;
    }
    setStatus("paid");
    setMessage("Thank you. Your dues payment is being confirmed.");
  }

  if (status === "paid") return <p role="status">{message}</p>;
  return (
    <form onSubmit={pay}>
      <p>Paying {label}</p>
      <PaymentElement />
      <button className="button small" type="submit" disabled={!stripe || status === "paying"}>{status === "paying" ? "Processing…" : `Pay ${label}`}</button>
      {status === "error" && <p role="alert" className="muted">{message}</p>}
    </form>
  );
}
