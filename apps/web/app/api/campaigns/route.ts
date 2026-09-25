import { NextRequest, NextResponse } from "next/server";
import { campaignSearchSchema, campaignCreateSchema } from "@benefitly/validation";
import { withUserContext } from "@/lib/database";
import { listPublishedCampaigns } from "@/lib/campaigns";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export const GET = withRouteErrorHandling(async function GET(request: NextRequest) {
  const parsed = campaignSearchSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "INVALID_QUERY", message: "Search parameters are invalid." } }, { status: 400 });
  }
  // Anonymous, RLS-scoped read: only status = 'published' rows are visible without app.user_id bound.
  const rows = await listPublishedCampaigns(parsed.data);
  return NextResponse.json({ data: rows });
});

export const POST = withRouteErrorHandling(async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to create a campaign." } }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = campaignCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "INVALID_BODY", message: parsed.error.message } }, { status: 400 });
  }
  const input = parsed.data;
  const slug = `${slugify(input.title)}-${Math.random().toString(36).slice(2, 8)}`;

  const [[campaign]] = await withUserContext(session.user.id, (tx) => [
    tx`
      with created as (
        insert into public.campaigns (slug, organization_id, owner_id, title, story, category, location, currency, goal_amount, status)
        values (${slug}, ${input.organizationId ?? null}, ${session.user.id}, ${input.title}, ${input.story}, ${input.category}, ${input.location ?? null}, ${input.currency}, ${input.goalAmount}, 'review')
        returning id, slug, title, status
      ),
      beneficiary as (
        insert into public.campaign_beneficiaries (campaign_id, profile_id, name, relationship)
        select id, ${session.user.id}, ${input.beneficiary.name}, ${input.beneficiary.relationship ?? null} from created
      ),
      review as (
        insert into public.campaign_reviews (campaign_id, status, submitted_by)
        select id, 'pending', ${session.user.id} from created
      )
      select id, slug, title, status from created
    `,
  ]);

  return NextResponse.json({ data: campaign }, { status: 201 });
});

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}
