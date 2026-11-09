// Creates the Stripe products and recurring prices that organization subscriptions check out with.
// Idempotent: a price whose amount already matches is reused; a changed amount creates a new price
// and moves the lookup key onto it. Keep billing-prices.json in step with
// database/migrations/0025_approved_pricing.sql, which shows the same prices to organizers.
//
//   STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-billing-setup.mjs

import Stripe from "stripe";
import { readFileSync } from "node:fs";

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  console.error("Set STRIPE_SECRET_KEY first.");
  process.exit(1);
}

const stripe = new Stripe(secretKey);
const plans = JSON.parse(readFileSync(new URL("./billing-prices.json", import.meta.url), "utf8"));
const intervals = [
  { name: "monthly", stripeInterval: "month", key: "monthlyCents" },
  { name: "annual", stripeInterval: "year", key: "annualCents" },
];

for (const plan of plans) {
  const productName = `Benefitly ${plan.name.replace(" (founder)", "")}`;
  const existing = await stripe.products.search({ query: `metadata['benefitly_tier']:'${plan.tier}' AND active:'true'` });
  const product = existing.data[0] ?? (await stripe.products.create({ name: productName, metadata: { benefitly_tier: plan.tier } }));

  for (const interval of intervals) {
    const lookupKey = `benefitly_${plan.lookupTier ?? plan.tier}_${interval.name}`;
    const unitAmount = plan[interval.key];
    const current = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
    if (current.data[0]?.unit_amount === unitAmount) {
      console.log(`ok       ${lookupKey} ${unitAmount} (${current.data[0].id})`);
      continue;
    }
    const price = await stripe.prices.create({
      product: product.id,
      currency: "usd",
      unit_amount: unitAmount,
      recurring: { interval: interval.stripeInterval },
      lookup_key: lookupKey,
      transfer_lookup_key: true,
    });
    console.log(`created  ${lookupKey} ${unitAmount} (${price.id})`);
  }
}
