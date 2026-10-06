import { withUserContext } from "@/lib/database";

export type OwnedCampaign = {
  id: string;
  slug: string;
  title: string;
  status: string;
  raised_amount: number;
  goal_amount: number;
  currency: string;
  supporter_count: number;
  review_status: string | null;
};

export async function listOwnedCampaigns(userId: string): Promise<OwnedCampaign[]> {
  const [rows] = await withUserContext(userId, (tx) => [
    tx`
      select c.id, c.slug, c.title, c.status, c.raised_amount, c.goal_amount, c.currency, c.supporter_count,
        (select r.status from public.campaign_reviews r where r.campaign_id = c.id order by r.submitted_at desc limit 1) as review_status
      from public.campaigns c
      where c.owner_id = ${userId}
      order by c.created_at desc
    `,
  ]);
  return rows as unknown as OwnedCampaign[];
}

export async function getOwnedCampaignById(userId: string, campaignId: string): Promise<OwnedCampaign | null> {
  const [rows] = await withUserContext(userId, (tx) => [
    tx`
      select c.id, c.slug, c.title, c.status, c.raised_amount, c.goal_amount, c.currency,
        (select r.status from public.campaign_reviews r where r.campaign_id = c.id order by r.submitted_at desc limit 1) as review_status
      from public.campaigns c
      where c.id = ${campaignId} and (c.owner_id = ${userId} or (c.organization_id is not null and exists (select 1 from public.organization_members m where m.organization_id = c.organization_id and m.user_id = ${userId} and m.status = 'active')))
    `,
  ]);
  return (rows[0] as OwnedCampaign) ?? null;
}

export async function getOwnPaymentAccount(userId: string, organizationId?: string) {
  const [rows] = await withUserContext(userId, (tx) => [tx`select * from public.get_own_payment_account(${userId}, ${organizationId ?? null})`]);
  return rows[0] as { id: string; provider: string; provider_account_id: string; status: string } | undefined;
}

export type CampaignDonor = { id: string; donor_name: string; gross_amount: number; currency: string; status: string; created_at: string };

export async function listCampaignDonors(userId: string, campaignId: string): Promise<CampaignDonor[]> {
  const [rows] = await withUserContext(userId, (tx) => [tx`select * from public.list_campaign_donors(${campaignId})`]);
  return rows as unknown as CampaignDonor[];
}
