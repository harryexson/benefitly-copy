import { NextRequest, NextResponse } from "next/server";
import { supportTicketSchema } from "@benefitly/validation";
import { withUserContext } from "@/lib/database";
import { orgErrorResponse } from "@/lib/org-api";
import { rateLimited } from "@/lib/rate-limit";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export const GET = withRouteErrorHandling(async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });
  const [rows] = await withUserContext(session.user.id, (tx) => [
    tx`select id, subject, body, status, resolution_note, organization_id, created_at, updated_at from public.support_tickets order by created_at desc limit 100`,
  ]);
  return NextResponse.json({ data: rows });
});

export const POST = withRouteErrorHandling(async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });
  const limited = await rateLimited(request, "support-ticket", 10, 3600);
  if (limited) return limited;
  const body = await request.json().catch(() => null);
  const parsed = supportTicketSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_BODY", message: parsed.error.message } }, { status: 400 });
  try {
    const [[ticket]] = await withUserContext(session.user.id, (tx) => [
      tx`select * from public.create_support_ticket(${parsed.data.subject}, ${parsed.data.body}, ${parsed.data.organizationId ?? null})`,
    ]);
    return NextResponse.json({ data: ticket }, { status: 201 });
  } catch (error) {
    return orgErrorResponse(error, "TICKET_FAILED");
  }
});
