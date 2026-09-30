import { loadStripe, type Stripe } from "@stripe/stripe-js";

// A missing publishable key must not crash the module at import time (this is imported into a
// client bundle built even when Stripe isn't configured yet, e.g. local dev with no keys set) --
// loadStripe(undefined) rejects at call time instead, which DonateForm already handles.
let stripePromise: Promise<Stripe | null> | undefined;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    stripePromise = key ? loadStripe(key) : Promise.resolve(null);
  }
  return stripePromise;
}
