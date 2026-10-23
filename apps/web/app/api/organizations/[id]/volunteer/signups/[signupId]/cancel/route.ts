import { NextRequest, NextResponse } from "next/server";
import { withUserContext } from "@/lib/database";
import { orgErrorResponse } from "@/lib/org-api";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export const POST = withRouteErrorHandling(async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string; signupId: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });
  const { signupId } = await params;
  try {
    const [[signup]] = await withUserContext(session.user.id, (tx) => [tx`select * from public.volunteer_cancel(${signupId})`]);
    return NextResponse.json({ data: signup });
  } catch (error) {
    return orgErrorResponse(error, "CANCEL_FAILED");
  }
});
