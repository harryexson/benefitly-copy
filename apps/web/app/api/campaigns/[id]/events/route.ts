import { NextRequest, NextResponse } from "next/server";
import { createCampaignEventSchema } from "@benefitly/validation";
import { createCampaignEvent, listCampaignEvents } from "@/lib/tickets";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export const GET = withRouteErrorHandling(async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const events = await listCampaignEvents(id);
  return NextResponse.json({ data: events });
});

export const POST = withRouteErrorHandling(async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = createCampaignEventSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_BODY", message: parsed.error.message } }, { status: 400 });

  try {
    const event = await createCampaignEvent(session.user.id, { campaignId: id, ...parsed.data });
    return NextResponse.json({ data: event }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create event";
    return NextResponse.json({ error: { code: message.includes("not authorized") ? "FORBIDDEN" : "EVENT_FAILED", message } }, { status: message.includes("not authorized") ? 403 : 400 });
  }
});
