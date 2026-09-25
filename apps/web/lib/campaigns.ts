import { sql } from "@/lib/database";
import type { CampaignCategory, CampaignStatus } from "@benefitly/domain";

export type CampaignRow = {
  id: string;
  slug: string;
  title: string;
  story: string;
  category: CampaignCategory;
  location: string | null;
  currency: string;
  goal_amount: number;
  raised_amount: number;
  supporter_count: number;
  status: CampaignStatus;
  organizer: string;
  image: string | null;
};

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=85";

export async function listPublishedCampaigns(input: { q?: string; category?: string } = {}): Promise<CampaignRow[]> {
  const rows = await sql`
    select c.id, c.slug, c.title, c.story, c.category, c.location, c.currency, c.goal_amount, c.raised_amount, c.supporter_count, c.status,
      coalesce(o.name, p.name, 'Benefitly organizer') as organizer,
      (select m.storage_key from public.campaign_media m where m.campaign_id = c.id order by m.position asc limit 1) as image
    from public.campaigns c
    left join public.profiles p on p.id = c.owner_id
    left join public.organizations o on o.id = c.organization_id
    where c.status = 'published'
      and (${input.category ?? null}::text is null or c.category = ${input.category ?? null})
      and (${input.q ?? null}::text is null or c.title ilike ${input.q ? `%${input.q}%` : null} or c.story ilike ${input.q ? `%${input.q}%` : null})
    order by c.published_at desc
    limit 60
  `;
  return rows.map(withDefaultImage) as CampaignRow[];
}

export async function getPublishedCampaignById(id: string): Promise<CampaignRow | null> {
  const [row] = await sql`
    select c.id, c.slug, c.title, c.story, c.category, c.location, c.currency, c.goal_amount, c.raised_amount, c.supporter_count, c.status,
      coalesce(o.name, p.name, 'Benefitly organizer') as organizer,
      (select m.storage_key from public.campaign_media m where m.campaign_id = c.id order by m.position asc limit 1) as image
    from public.campaigns c
    left join public.profiles p on p.id = c.owner_id
    left join public.organizations o on o.id = c.organization_id
    where c.id = ${id} and c.status = 'published'
    limit 1
  `;
  return row ? (withDefaultImage(row) as CampaignRow) : null;
}

export async function getPublishedCampaignBySlug(slug: string): Promise<CampaignRow | null> {
  const [row] = await sql`
    select c.id, c.slug, c.title, c.story, c.category, c.location, c.currency, c.goal_amount, c.raised_amount, c.supporter_count, c.status,
      coalesce(o.name, p.name, 'Benefitly organizer') as organizer,
      (select m.storage_key from public.campaign_media m where m.campaign_id = c.id order by m.position asc limit 1) as image
    from public.campaigns c
    left join public.profiles p on p.id = c.owner_id
    left join public.organizations o on o.id = c.organization_id
    where c.slug = ${slug} and c.status = 'published'
    limit 1
  `;
  return row ? (withDefaultImage(row) as CampaignRow) : null;
}

function withDefaultImage(row: Record<string, unknown>) {
  return { ...row, image: row.image ?? DEFAULT_IMAGE };
}

export type CampaignMediaItem = { id: string; storage_key: string; alt_text: string | null; media_type: "image" | "video"; position: number };

export async function listCampaignMedia(campaignId: string): Promise<CampaignMediaItem[]> {
  const rows = await sql`
    select id, storage_key, alt_text, media_type, position from public.campaign_media
    where campaign_id = ${campaignId}
    order by position asc
  `;
  return rows as unknown as CampaignMediaItem[];
}

export type CampaignUpdateItem = { id: string; body: string; created_at: string; author_name: string | null };

export async function listCampaignUpdates(campaignId: string): Promise<CampaignUpdateItem[]> {
  const rows = await sql`
    select u.id, u.body, u.created_at, p.name as author_name
    from public.campaign_updates u
    left join public.profiles p on p.id = u.author_id
    where u.campaign_id = ${campaignId}
    order by u.created_at desc
  `;
  return rows as unknown as CampaignUpdateItem[];
}
