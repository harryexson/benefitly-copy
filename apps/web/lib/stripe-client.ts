import { loadStripe, type Stripe } from "@stripe/stripe-js";

// A missing publishable key must not crash the module at import time (this is imported into a
// client bundle built even when Stripe isn't configured yet, e.g. local dev with no keys set) --
// loadStripe(undefined) rejects at call time instead, which DonateForm already handles.
//
// Direct charges settle into the campaign's connected account, so Stripe.js must be loaded with
// that account's id. One instance per account is cached so re-renders never create a new Stripe.
const stripeByAccount = new Map<string, Promise<Stripe | null>>();

export function getStripeForAccount(stripeAccountId: string): Promise<Stripe | null> {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) return Promise.resolve(null);
  let instance = stripeByAccount.get(stripeAccountId);
  if (!instance) {
    instance = loadStripe(key, { stripeAccount: stripeAccountId });
    stripeByAccount.set(stripeAccountId, instance);
  }
  return instance;
}
