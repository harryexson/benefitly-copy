import { NextRequest, NextResponse } from "next/server";
import { moderationDecisionSchema } from "@benefitly/validation";
import { sql, withUserContext } from "@/lib/database";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";
import { notify } from "@/lib/notifications";

export const dynamic = "force-dynamic";

/**
 * Records an admin moderation decision (approve/reject/pause/etc.) for a campaign, and, for
 * Phase 1's manual-approval requirement, transitions the campaign's review + publish status in
 * the same call. Authorization is enforced inside `record_moderation_action` (is_platform_admin);
 * a non-admin caller gets a Postgres exception, surfaced here as 403.
 */
export const POST = withRouteErrorHandling(async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = moderationDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "INVALID_BODY", message: parsed.error.message } }, { status: 400 });
  }
  const input = parsed.data;

  try {
    const [[action]] = await withUserContext(session.user.id, (tx) => [
      tx`select * from public.record_moderation_action(${input.campaignId}, ${input.reportId ?? null}, ${input.action}, ${input.reason ?? null})`,
    ]);
    if (input.action === "approve" || input.action === "reject") {
      const [campaign] = await sql`select owner_id, organization_id, title from public.campaigns where id = ${input.campaignId}`;
      if (campaign) {
        await notify(campaign.owner_id as string, campaign.organization_id as string | null, input.action === "approve" ? "campaign_approved" : "campaign_rejected", {
          campaignTitle: campaign.title,
        });
      }
    }
    return NextResponse.json({ data: action }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Moderation action failed";
    const status = message.includes("not authorized") ? 403 : 400;
    return NextResponse.json({ error: { code: status === 403 ? "FORBIDDEN" : "MODERATION_FAILED", message } }, { status });
  }
});
