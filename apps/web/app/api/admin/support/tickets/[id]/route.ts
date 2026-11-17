import { NextRequest, NextResponse } from "next/server";
import { supportTicketUpdateSchema } from "@benefitly/validation";
import { withUserContext } from "@/lib/database";
import { orgErrorResponse } from "@/lib/org-api";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export const POST = withRouteErrorHandling(async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = supportTicketUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_BODY", message: parsed.error.message } }, { status: 400 });
  try {
    const [[ticket]] = await withUserContext(session.user.id, (tx) => [
      tx`select * from public.admin_update_support_ticket(${id}, ${parsed.data.status}, ${parsed.data.note ?? null})`,
    ]);
    return NextResponse.json({ data: ticket });
  } catch (error) {
    return orgErrorResponse(error, "TICKET_UPDATE_FAILED");
  }
});
