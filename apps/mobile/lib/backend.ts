import { api } from "./api";

export type CampaignSummary = {
  id: string;
  slug: string;
  title: string;
  story: string;
  category: string;
  location: string | null;
  currency: string;
  goal_amount: number;
  raised_amount: number;
  supporter_count: number;
  status: string;
  organizer: string;
  image: string | null;
};

export function listCampaigns(params: { q?: string; category?: string } = {}) {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.category) query.set("category", params.category);
  const qs = query.toString();
  return api<CampaignSummary[]>(`/api/campaigns${qs ? `?${qs}` : ""}`);
}

export function getCampaignBySlug(slug: string) {
  return api<CampaignSummary>(`/api/campaigns/by-slug/${slug}`);
}

export type DonationResult = {
  donationId: string;
  provider: string;
  status: string;
  clientSecret?: string;
  redirectUrl?: string;
  grossCharge: number;
  netToCampaign: number;
  platformContribution: number;
  currency: string;
};

export function createDonation(input: { campaignId: string; amount: number; currency: string; platformContribution: number; idempotencyKey: string; donorEmail?: string }) {
  return api<DonationResult>("/api/donations", { method: "POST", body: JSON.stringify(input) });
}

export function reportCampaign(campaignId: string, input: { reason: string; details?: string }) {
  return api<{ id: string; status: string }>(`/api/campaigns/${campaignId}/report`, { method: "POST", body: JSON.stringify(input) });
}

export function createCampaign(input: {
  title: string;
  story: string;
  category: string;
  location?: string;
  currency: string;
  goalAmount: number;
  beneficiary: { name: string; relationship?: string };
}) {
  return api<{ id: string; slug: string; title: string; status: string }>("/api/campaigns", { method: "POST", body: JSON.stringify(input) });
}

export function registerOrganizer(input: { legalName: string; country: string; entityType: "individual" | "business"; provider: "stripe_connect" | "adyen_platforms" }) {
  return api<{ provider: string; providerAccountId: string; onboardingUrl: string }>("/api/organizer/register", { method: "POST", body: JSON.stringify(input) });
}

export function requestPayout(input: { campaignId: string; paymentAccountId: string; amount: number; currency: string; idempotencyKey: string }) {
  return api<{ id: string; status: string }>("/api/payouts", { method: "POST", body: JSON.stringify(input) });
}

export type OwnedCampaign = {
  id: string;
  slug: string;
  title: string;
  status: string;
  raised_amount: number;
  goal_amount: number;
  currency: string;
  review_status: string | null;
};

export type MyCampaignsResult = {
  campaigns: OwnedCampaign[];
  paymentAccount: { id: string; provider: string; provider_account_id: string; status: string } | null;
};

export function getMyCampaigns() {
  return api<MyCampaignsResult>("/api/me/campaigns");
}

export type CampaignMediaItem = { id: string; storage_key: string; alt_text: string | null; media_type: "image" | "video"; position: number };

export function uploadCampaignMedia(campaignId: string, file: { uri: string; name: string; type: string }) {
  const form = new FormData();
  // React Native's fetch/FormData accepts this shape directly; it is not a real Blob/File.
  form.append("file", file as unknown as Blob);
  return api<CampaignMediaItem>(`/api/campaigns/${campaignId}/media`, { method: "POST", body: form });
}

export type CampaignUpdateItem = { id: string; body: string; created_at: string };

export function postCampaignUpdate(campaignId: string, body: string) {
  return api<CampaignUpdateItem>(`/api/campaigns/${campaignId}/updates`, { method: "POST", body: JSON.stringify({ body }) });
}

export function registerPushToken(token: string, platform: "ios" | "android") {
  return api<{ registered: true }>("/api/me/push-tokens", { method: "POST", body: JSON.stringify({ token, platform }) });
}

export type AppNotification = { id: string; type: string; payload: Record<string, unknown>; read_at: string | null; created_at: string };

export function getMyNotifications() {
  return api<AppNotification[]>("/api/me/notifications");
}

export function markNotificationRead(id: string) {
  return api<AppNotification>(`/api/me/notifications/${id}/read`, { method: "POST" });
}
