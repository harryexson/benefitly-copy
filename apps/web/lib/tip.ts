// Optional donor tips. Duplicated from @benefitly/payments/src/fees.ts because that package's root
// export pulls in the Stripe/Adyen server SDKs, which must never reach a client bundle.
export const SUGGESTED_CONTRIBUTION_RATES = [0, 0.1, 0.15, 0.18] as const;

export function suggestedContribution(amount: number, rate: number): number {
  return Math.round(amount * rate);
}
