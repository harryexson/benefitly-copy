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

export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const [rows] = await withUserContext(userId, (tx) => [tx`select 1 from public.platform_admins where profile_id = ${userId}`]);
  return rows.length > 0;
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

export type PlatformStats = {
  total_campaigns: number;
  published_campaigns: number;
  total_organizations: number;
  total_raised_cents: number;
  total_donors: number;
  pending_reviews: number;
  open_reports: number;
  pending_payouts: number;
};

export async function platformStats(adminId: string): Promise<PlatformStats | null> {
  const [rows] = await withUserContext(adminId, (tx) => [tx`select * from public.platform_stats()`]);
  return (rows[0] as PlatformStats) ?? null;
}

export type AdminOrganization = {
  id: string;
  name: string;
  slug: string;
  plan_tier: string;
  member_count: number;
  total_raised_cents: number;
  created_at: string;
};

export async function listOrganizationsAdmin(adminId: string): Promise<AdminOrganization[]> {
  const [rows] = await withUserContext(adminId, (tx) => [tx`select * from public.list_organizations_admin()`]);
  return rows as unknown as AdminOrganization[];
}

export async function adminSetOrganizationPlan(adminId: string, orgId: string, tier: string) {
  const [rows] = await withUserContext(adminId, (tx) => [tx`select * from public.admin_set_organization_plan(${orgId}, ${tier})`]);
  return rows[0];
}

export type AuditLogEntry = {
  id: string;
  organization_id: string | null;
  actor_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export async function listAuditLog(adminId: string, limit = 100): Promise<AuditLogEntry[]> {
  const [rows] = await withUserContext(adminId, (tx) => [tx`select * from public.list_audit_log_admin(${limit})`]);
  return rows as unknown as AuditLogEntry[];
}

export type WebhookEventEntry = {
  id: string;
  provider: string;
  provider_event_id: string;
  event_type: string;
  received_at: string;
  processed_at: string | null;
  processing_error: string | null;
};

export async function listWebhookEvents(adminId: string, limit = 100): Promise<WebhookEventEntry[]> {
  const [rows] = await withUserContext(adminId, (tx) => [tx`select * from public.list_webhook_events_admin(${limit})`]);
  return rows as unknown as WebhookEventEntry[];
}
