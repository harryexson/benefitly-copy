import { NextResponse } from "next/server";
import { getPublishedCampaignBySlug } from "@/lib/campaigns";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

/**
 * Single-campaign JSON read, by slug. The web app's own pages query the database directly from
 * server components (see lib/campaigns.ts); this route exists for apps/mobile and any other
 * client that only has HTTP access to the shared backend.
 */
export const GET = withRouteErrorHandling(async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const campaign = await getPublishedCampaignBySlug(slug);
  if (!campaign) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Campaign not found." } }, { status: 404 });
  }
  return NextResponse.json({ data: campaign });
});
