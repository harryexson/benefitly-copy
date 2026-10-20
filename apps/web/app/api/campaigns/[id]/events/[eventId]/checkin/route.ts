import { NextRequest, NextResponse } from "next/server";
import { checkInSchema } from "@benefitly/validation";
import { organizerCheckInTicket } from "@/lib/tickets";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export const POST = withRouteErrorHandling(async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; eventId: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });

  const { eventId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = checkInSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_BODY", message: parsed.error.message } }, { status: 400 });

  try {
    const ticket = await organizerCheckInTicket(session.user.id, eventId, parsed.data.code);
    return NextResponse.json({ data: ticket });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not check in this ticket";
    return NextResponse.json({ error: { code: message.includes("not authorized") ? "FORBIDDEN" : "CHECKIN_FAILED", message } }, { status: message.includes("not authorized") ? 403 : 404 });
  }
});
