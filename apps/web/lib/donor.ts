import { withUserContext } from "@/lib/database";

export type Donation = {
  id: string;
  campaign_id: string;
  campaign_title: string;
  campaign_slug: string;
  gross_amount: number;
  currency: string;
  status: string;
  created_at: string;
};

export type GivingSummary = {
  total_given_cents: number;
  campaigns_supported: number;
  donation_count: number;
  ytd_given_cents: number;
};

export type GivingPlan = {
  id: string;
  donor_id: string;
  campaign_id: string | null;
  category: string | null;
  amount_cents: number;
  currency: string;
  cadence: "weekly" | "monthly" | "quarterly" | "annually";
  status: "active" | "paused" | "cancelled";
  annual_goal_cents: number | null;
  next_reminder_at: string;
  created_at: string;
};

export type SavedCampaign = { campaign_id: string; created_at: string };

export async function myDonations(userId: string): Promise<Donation[]> {
  const [rows] = await withUserContext(userId, (tx) => [tx`select * from public.my_donations()`]);
  return rows as unknown as Donation[];
}

export async function myGivingSummary(userId: string): Promise<GivingSummary> {
  const [rows] = await withUserContext(userId, (tx) => [tx`select * from public.my_giving_summary()`]);
  return rows[0] as unknown as GivingSummary;
}

export async function myGivingPlans(userId: string): Promise<GivingPlan[]> {
  const [rows] = await withUserContext(userId, (tx) => [
    tx`select * from public.giving_plans where donor_id = ${userId} order by created_at desc`,
  ]);
  return rows as unknown as GivingPlan[];
}

export async function mySavedCampaigns(userId: string): Promise<SavedCampaign[]> {
  const [rows] = await withUserContext(userId, (tx) => [
    tx`select campaign_id, created_at from public.saved_campaigns where profile_id = ${userId} order by created_at desc`,
  ]);
  return rows as unknown as SavedCampaign[];
}

export async function createGivingPlan(
  userId: string,
  input: { campaignId?: string; category?: string; amountCents: number; currency: string; cadence: GivingPlan["cadence"]; annualGoalCents?: number },
): Promise<GivingPlan> {
  const [rows] = await withUserContext(userId, (tx) => [
    tx`select * from public.create_giving_plan(${input.campaignId ?? null}, ${input.category ?? null}, ${input.amountCents}, ${input.currency}, ${input.cadence}, ${input.annualGoalCents ?? null})`,
  ]);
  return rows[0] as unknown as GivingPlan;
}

export async function setGivingPlanStatus(userId: string, planId: string, status: GivingPlan["status"]): Promise<GivingPlan> {
  const [rows] = await withUserContext(userId, (tx) => [tx`select * from public.set_giving_plan_status(${planId}, ${status})`]);
  return rows[0] as unknown as GivingPlan;
}

export async function toggleSavedCampaign(userId: string, campaignId: string): Promise<boolean> {
  const [rows] = await withUserContext(userId, (tx) => [tx`select public.toggle_saved_campaign(${campaignId}) as saved`]);
  return (rows[0] as { saved: boolean }).saved;
}
