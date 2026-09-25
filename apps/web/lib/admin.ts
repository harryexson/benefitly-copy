import { withUserContext } from "@/lib/database";

export type PendingReview = { id: string; campaign_id: string; title: string; slug: string; owner_name: string; submitted_at: string };
export type OpenReport = { id: string; campaign_id: string; title: string; slug: string; reason: string; details: string | null; created_at: string };

export async function listPendingReviews(adminId: string): Promise<PendingReview[]> {
  const [rows] = await withUserContext(adminId, (tx) => [
    tx`
      select r.id, r.campaign_id, c.title, c.slug, coalesce(p.name, 'Unknown') as owner_name, r.submitted_at
      from public.campaign_reviews r
      join public.campaigns c on c.id = r.campaign_id
      left join public.profiles p on p.id = c.owner_id
      where r.status = 'pending'
      order by r.submitted_at asc
    `,
  ]);
  return rows as unknown as PendingReview[];
}

export type PendingPayout = {
  id: string;
  campaign_id: string;
  campaign_title: string;
  campaign_slug: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  provider_account_id: string;
  requester_name: string | null;
  created_at: string;
};

export async function listPendingPayouts(adminId: string): Promise<PendingPayout[]> {
  const [rows] = await withUserContext(adminId, (tx) => [tx`select * from public.list_pending_payouts()`]);
  return rows as unknown as PendingPayout[];
}

export async function listOpenReports(adminId: string): Promise<OpenReport[]> {
  const [rows] = await withUserContext(adminId, (tx) => [
    tx`
      select rep.id, rep.campaign_id, c.title, c.slug, rep.reason, rep.details, rep.created_at
      from public.campaign_reports rep
      join public.campaigns c on c.id = rep.campaign_id
      where rep.status = 'open'
      order by rep.created_at asc
    `,
  ]);
  return rows as unknown as OpenReport[];
}
