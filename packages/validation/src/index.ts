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
  donorEmail: z.string().email().optional(),
  donorName: z.string().trim().max(120).optional(),
  message: z.string().trim().max(500).optional(),
  anonymous: z.boolean().default(false),
}).refine((value) => value.platformContribution <= value.amount, "Contribution cannot exceed donation");

export const organizerRegistrationSchema = z.object({
  legalName: z.string().trim().min(2).max(160),
  country: z.string().length(2),
  entityType: z.enum(["individual", "business"]),
  provider: z.enum(["stripe_connect", "adyen_platforms"]).default("stripe_connect"),
});

export const campaignCreateSchema = z.object({
  title: z.string().trim().min(5).max(160),
  story: z.string().trim().min(50).max(20000),
  category: z.enum(["emergency", "medical", "memorial", "education", "community", "faith", "disaster"]),
  location: z.string().trim().max(160).optional(),
  currency: z.string().length(3).default("USD"),
  goalAmount: z.number().int().min(100),
  beneficiary: z.object({
    name: z.string().trim().min(2).max(160),
    relationship: z.string().trim().max(80).optional(),
  }),
  organizationId: z.string().uuid().optional(),
});

export const campaignUpdateSchema = z.object({
  campaignId: z.string().uuid(),
  body: z.string().trim().min(1).max(5000),
});

export const reportCampaignSchema = z.object({
  campaignId: z.string().uuid(),
  reason: z.enum(["fraud", "misuse_of_funds", "inappropriate_content", "impersonation", "duplicate", "other"]),
  details: z.string().trim().max(2000).optional(),
});

export const moderationDecisionSchema = z.object({
  campaignId: z.string().uuid(),
  reportId: z.string().uuid().optional(),
  action: z.enum(["approve", "reject", "request_changes", "pause", "resume", "remove", "restore", "note"]),
  reason: z.string().trim().max(2000).optional(),
});

export const payoutRequestSchema = z.object({
  campaignId: z.string().uuid(),
  paymentAccountId: z.string().uuid(),
  amount: z.number().int().min(100),
  currency: z.string().length(3).default("USD"),
  idempotencyKey: z.string().uuid(),
});

export const refundRequestSchema = z.object({
  donationId: z.string().uuid(),
  amount: z.number().int().min(1).optional(),
  reason: z.enum(["requested_by_customer", "fraudulent", "duplicate"]).default("requested_by_customer"),
  idempotencyKey: z.string().uuid(),
});

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(160),
});

export const addMemberSchema = z.object({
  memberNumber: z.string().trim().min(1).max(40),
  membershipLevel: z.string().trim().max(80).optional(),
  contact: z.object({ email: z.string().email().optional(), phone: z.string().trim().max(40).optional(), name: z.string().trim().max(160).optional() }).default({}),
  userId: z.string().uuid().optional(),
});

export const recordContributionSchema = z.object({
  memberId: z.string().uuid(),
  kind: z.string().trim().min(1).max(80).default("Dues"),
  amount: z.number().int().min(1),
  currency: z.string().length(3).default("USD"),
});

export const createBenefitProgramSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().min(1).max(5000),
  eligibility: z.string().trim().max(2000).optional(),
  maximumAmount: z.number().int().min(0).optional(),
  waitingPeriodDays: z.number().int().min(0).default(0),
});

export const submitBenefitClaimSchema = z.object({
  programId: z.string().uuid(),
  memberId: z.string().uuid(),
  requestedAmount: z.number().int().min(1),
  reason: z.string().trim().min(1).max(2000),
});

export const decideBenefitClaimSchema = z.object({
  decision: z.enum(["approved", "denied"]),
  note: z.string().trim().max(2000).optional(),
});

export const createEventSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(5000).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  location: z.string().trim().max(200).optional(),
  capacity: z.number().int().min(1).optional(),
  visibility: z.enum(["public", "members"]).default("members"),
});

export const registerForEventSchema = z.object({
  memberId: z.string().uuid(),
});

export const postAnnouncementSchema = z.object({
  title: z.string().trim().min(2).max(200),
  body: z.string().trim().min(1).max(5000),
});
