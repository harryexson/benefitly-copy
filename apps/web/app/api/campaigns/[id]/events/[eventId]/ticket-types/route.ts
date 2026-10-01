import { NextRequest, NextResponse } from "next/server";
import { createTicketTypeSchema } from "@benefitly/validation";
import { createTicketType, listEventTicketTypes } from "@/lib/tickets";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export const GET = withRouteErrorHandling(async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string; eventId: string }> }) {
  const { eventId } = await params;
  const ticketTypes = await listEventTicketTypes(eventId);
  return NextResponse.json({ data: ticketTypes });
});

export const POST = withRouteErrorHandling(async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; eventId: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });

  const { eventId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = createTicketTypeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_BODY", message: parsed.error.message } }, { status: 400 });

  try {
    const ticketType = await createTicketType(session.user.id, {
      eventId,
      name: parsed.data.name,
      priceCents: Math.round(parsed.data.price * 100),
      currency: parsed.data.currency,
      quantityAvailable: parsed.data.quantityAvailable,
    });
    return NextResponse.json({ data: ticketType }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create ticket type";
    return NextResponse.json({ error: { code: message.includes("not authorized") ? "FORBIDDEN" : "TICKET_TYPE_FAILED", message } }, { status: message.includes("not authorized") ? 403 : 400 });
  }
});
