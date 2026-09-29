import { NextRequest, NextResponse } from "next/server";
import { toggleSavedCampaignSchema } from "@benefitly/validation";
import { toggleSavedCampaign } from "@/lib/donor";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export const POST = withRouteErrorHandling(async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = toggleSavedCampaignSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_BODY", message: parsed.error.message } }, { status: 400 });

  const saved = await toggleSavedCampaign(session.user.id, parsed.data.campaignId);
  return NextResponse.json({ data: { saved } });
});
