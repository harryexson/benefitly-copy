import { z } from "zod";

export const campaignSearchSchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.enum(["emergency", "medical", "memorial", "education", "community", "faith", "disaster"]).optional(),
});

export const donationIntentSchema = z.object({
  campaignId: z.string().uuid(),
  amount: z.number().int().min(100),
  currency: z.string().length(3).default("USD"),
  platformContribution: z.number().int().min(0).default(0),
  idempotencyKey: z.string().uuid(),
}).refine((value) => value.platformContribution <= value.amount, "Contribution cannot exceed donation");
