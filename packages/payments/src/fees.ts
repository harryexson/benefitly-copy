/**
 * Platform-contribution ("optional tip") and processor-fee math.
 * All amounts are integer minor units (cents). No floating point money.
 */

export const SUGGESTED_CONTRIBUTION_RATES = [0, 0.1, 0.15, 0.18] as const;
export const DEFAULT_SUGGESTED_RATE = 0.15;

/** Round-half-up integer cents, matching how checkout UIs quote suggested tips. */
export function suggestedContribution(donationAmount: number, rate: number): number {
  if (donationAmount < 0) throw new Error("donationAmount must be >= 0");
  if (rate < 0 || rate > 1) throw new Error("rate must be between 0 and 1");
  return Math.round(donationAmount * rate);
}

export type DonationSplitInput = {
  /** Amount the donor chose to give to the campaign, before any platform contribution. */
  donationAmount: number;
  /** Optional voluntary contribution to the platform, chosen independently by the donor. */
  platformContribution: number;
  currency: string;
};

export type DonationSplit = {
  /** Total amount charged to the donor's payment method. */
  grossCharge: number;
  /** Amount that will be transferred to the campaign's connected account. */
  netToCampaign: number;
  /** Voluntary platform contribution, retained by the platform. */
  platformContribution: number;
  currency: string;
};

/**
 * Benefitly never deducts a mandatory platform fee from campaign proceeds; the platform is
 * funded only by the donor's optional contribution, matching the "Keep Fundraising Free" model.
 */
export function computeDonationSplit(input: DonationSplitInput): DonationSplit {
  if (!Number.isInteger(input.donationAmount) || input.donationAmount <= 0) {
    throw new Error("donationAmount must be a positive integer number of minor units");
  }
  if (!Number.isInteger(input.platformContribution) || input.platformContribution < 0) {
    throw new Error("platformContribution must be a non-negative integer number of minor units");
  }
  return {
    grossCharge: input.donationAmount + input.platformContribution,
    netToCampaign: input.donationAmount,
    platformContribution: input.platformContribution,
    currency: input.currency,
  };
}
