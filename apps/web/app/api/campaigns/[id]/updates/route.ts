import { NextRequest, NextResponse } from "next/server";
import { campaignUpdateSchema } from "@benefitly/validation";
import { withUserContext } from "@/lib/database";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export const POST = withRouteErrorHandling(async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });

  const { id: campaignId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = campaignUpdateSchema.safeParse({ ...body, campaignId });
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "INVALID_BODY", message: parsed.error.message } }, { status: 400 });
  }

  try {
    const [[update]] = await withUserContext(session.user.id, (tx) => [
      tx`select * from public.post_campaign_update(${campaignId}, ${parsed.data.body})`,
    ]);
    return NextResponse.json({ data: update }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not post update";
    return NextResponse.json({ error: { code: message.includes("not authorized") ? "FORBIDDEN" : "UPDATE_FAILED", message } }, { status: message.includes("not authorized") ? 403 : 400 });
  }
});
