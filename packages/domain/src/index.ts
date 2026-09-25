export const campaignCategories = ["emergency", "medical", "memorial", "education", "community", "faith", "disaster"] as const;
export type CampaignCategory = (typeof campaignCategories)[number];
export type CampaignStatus = "draft" | "review" | "published" | "paused" | "completed";
export type Permission = "organization.manage" | "members.manage" | "finance.manage" | "benefits.manage" | "events.manage" | "communications.manage" | "payouts.approve";
export type Money = { amount: number; currency: string };
export type CampaignSummary = { id: string; slug: string; title: string; organizer: string; location?: string; category: CampaignCategory; raised: Money; goal: Money; supporterCount: number; image: string; status: CampaignStatus };
export const percentage = (raised: number, goal: number) => goal <= 0 ? 0 : Math.min(100, Math.round((raised / goal) * 100));
export * from "./payments.js";
export * from "./trust.js";
