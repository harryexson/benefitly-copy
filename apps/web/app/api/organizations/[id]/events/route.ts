import { NextRequest, NextResponse } from "next/server";
import { createEventSchema } from "@benefitly/validation";
import { withUserContext } from "@/lib/database";
import { listEvents } from "@/lib/associations";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export const GET = withRouteErrorHandling(async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });
  const { id } = await params;
  return NextResponse.json({ data: await listEvents(session.user.id, id) });
});

export const POST = withRouteErrorHandling(async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_BODY", message: parsed.error.message } }, { status: 400 });

  try {
    const [[event]] = await withUserContext(session.user.id, (tx) => [
      tx`select * from public.create_event(${id}, ${parsed.data.title}, ${parsed.data.description ?? null}, ${parsed.data.startsAt}::timestamptz, ${parsed.data.endsAt ?? null}::timestamptz, ${parsed.data.location ?? null}, ${parsed.data.capacity ?? null}, ${parsed.data.visibility})`,
    ]);
    return NextResponse.json({ data: event }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create event";
    return NextResponse.json({ error: { code: message.includes("not authorized") ? "FORBIDDEN" : "EVENT_FAILED", message } }, { status: message.includes("not authorized") ? 403 : 400 });
  }
});
