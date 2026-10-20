import { NextRequest, NextResponse } from "next/server";
import { checkInSchema } from "@benefitly/validation";
import { selfCheckInTicket } from "@/lib/tickets";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

// Public, no auth: a ticket's own code is the authorization (see self_check_in_ticket in
// database/migrations/0014_ticketed_events.sql), matching the self-service NFC-tag/QR flow.
export const POST = withRouteErrorHandling(async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = checkInSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_BODY", message: parsed.error.message } }, { status: 400 });

  try {
    const result = await selfCheckInTicket(parsed.data.code);
    return NextResponse.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ticket not found";
    return NextResponse.json({ error: { code: "CHECKIN_FAILED", message } }, { status: 404 });
  }
});
