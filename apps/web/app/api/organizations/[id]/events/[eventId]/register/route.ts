import { NextRequest, NextResponse } from "next/server";
import { registerForEventSchema } from "@benefitly/validation";
import { withUserContext } from "@/lib/database";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export const POST = withRouteErrorHandling(async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });

  const { eventId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = registerForEventSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_BODY", message: parsed.error.message } }, { status: 400 });

  try {
    const [[registration]] = await withUserContext(session.user.id, (tx) => [tx`select * from public.register_for_event(${eventId}, ${parsed.data.memberId})`]);
    return NextResponse.json({ data: registration }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not register for event";
    return NextResponse.json({ error: { code: message.includes("not authorized") ? "FORBIDDEN" : "REGISTRATION_FAILED", message } }, { status: message.includes("not authorized") ? 403 : 400 });
  }
});
