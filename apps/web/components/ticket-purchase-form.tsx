"use client";

import { useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe-client";
import { FeeTransparencyBanner } from "@/components/fee-transparency-banner";
import type { TicketType } from "@/lib/tickets";

type PurchaseResult = { donationId: string; ticketCount: number; clientSecret?: string; grossCharge: number; currency: string };

export function TicketPurchaseForm({ campaignId, eventId, ticketTypes }: { campaignId: string; eventId: string; ticketTypes: TicketType[] }) {
  const available = ticketTypes.filter((t) => t.quantity_available == null || t.quantity_sold < t.quantity_available);
  const [ticketTypeId, setTicketTypeId] = useState(available[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [attendeeName, setAttendeeName] = useState("");
  const [attendeeEmail, setAttendeeEmail] = useState("");
  const [attendeePhone, setAttendeePhone] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "ready-to-pay" | "paid" | "error">("idle");
  const [result, setResult] = useState<PurchaseResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedType = ticketTypes.find((t) => t.id === ticketTypeId);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedType) return;
    setStatus("submitting");
    setErrorMessage("");
    const response = await fetch(`/api/campaigns/${campaignId}/events/${eventId}/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticketTypeId,
        quantity,
        attendeeName,
        attendeeEmail,
        attendeePhone: attendeePhone || undefined,
        platformContribution: 0,
        idempotencyKey: crypto.randomUUID(),
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus("error");
      setErrorMessage(body?.error?.message ?? "Could not reserve your tickets. Please try again.");
      return;
    }
    const data = body.data as PurchaseResult;
    setResult(data);
    setStatus(data.clientSecret ? "ready-to-pay" : "paid");
  }

  if (status === "paid" && result) {
    return (
      <div className="donate-panel">
        <h2>You&apos;re all set!</h2>
        <p>
          {result.ticketCount} ticket{result.ticketCount > 1 ? "s" : ""} confirmed. A confirmation with your QR code{result.ticketCount > 1 ? "s" : ""} is on its way to {attendeeEmail}.
        </p>
      </div>
    );
  }

  if (status === "ready-to-pay" && result?.clientSecret) {
    return (
      <div className="donate-panel">
        <h2>Enter payment details</h2>
        <p className="muted">
          Charging ${(result.grossCharge / 100).toLocaleString()} {result.currency} for {result.ticketCount} ticket{result.ticketCount > 1 ? "s" : ""}.
        </p>
        <Elements stripe={getStripe()} options={{ clientSecret: result.clientSecret }}>
          <TicketPaymentStep onSuccess={() => setStatus("paid")} onError={setErrorMessage} />
        </Elements>
        {errorMessage && <p className="muted">{errorMessage}</p>}
      </div>
    );
  }

  return (
    <form className="donate-panel" onSubmit={onSubmit} style={{ maxWidth: 480 }}>
      <h2>Buy tickets</h2>
      <FeeTransparencyBanner compact />

      <label htmlFor="ticket-type">Ticket type</label>
      <select id="ticket-type" value={ticketTypeId} onChange={(e) => setTicketTypeId(e.target.value)} required>
        {available.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} — {t.price_cents === 0 ? "Free" : `$${(t.price_cents / 100).toFixed(2)}`}
          </option>
        ))}
      </select>
      {available.length === 0 && <p className="muted">All tickets for this event are sold out.</p>}

      <label htmlFor="ticket-quantity">Quantity</label>
      <input id="ticket-quantity" type="number" min={1} max={20} value={quantity} onChange={(e) => setQuantity(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} />

      <label htmlFor="attendee-name">Name</label>
      <input id="attendee-name" required minLength={2} maxLength={160} value={attendeeName} onChange={(e) => setAttendeeName(e.target.value)} />

      <label htmlFor="attendee-email">Email (for your tickets)</label>
      <input id="attendee-email" type="email" required value={attendeeEmail} onChange={(e) => setAttendeeEmail(e.target.value)} />

      <label htmlFor="attendee-phone">Phone (optional, for a text confirmation)</label>
      <input id="attendee-phone" type="tel" value={attendeePhone} onChange={(e) => setAttendeePhone(e.target.value)} placeholder="+15551234567" />

      {selectedType && (
        <p className="amount">
          Total: <strong>${((selectedType.price_cents * quantity) / 100).toLocaleString()}</strong>
        </p>
      )}

      <button className="button" type="submit" disabled={status === "submitting" || available.length === 0}>
        {status === "submitting" ? "Processing…" : "Continue"}
      </button>
      {status === "error" && <p className="muted">{errorMessage}</p>}
    </form>
  );
}

function TicketPaymentStep({ onSuccess, onError }: { onSuccess: () => void; onError: (message: string) => void }) {
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
