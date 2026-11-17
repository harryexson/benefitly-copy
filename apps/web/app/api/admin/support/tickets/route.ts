import { NextRequest, NextResponse } from "next/server";
import { withUserContext } from "@/lib/database";
import { orgErrorResponse } from "@/lib/org-api";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export const GET = withRouteErrorHandling(async function GET(_request: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });
  try {
    const [rows] = await withUserContext(session.user.id, (tx) => [tx`select * from public.admin_list_support_tickets(200)`]);
    return NextResponse.json({ data: rows });
  } catch (error) {
    return orgErrorResponse(error, "QUEUE_FAILED");
  }
});
