import { NextRequest, NextResponse } from "next/server";
import { volunteerSignupSchema } from "@benefitly/validation";
import { withUserContext } from "@/lib/database";
import { orgErrorResponse } from "@/lib/org-api";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export const POST = withRouteErrorHandling(async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; oppId: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });
  const { oppId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = volunteerSignupSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_BODY", message: parsed.error.message } }, { status: 400 });
  try {
    const [[signup]] = await withUserContext(session.user.id, (tx) => [tx`select * from public.volunteer_sign_up(${oppId}, ${parsed.data.memberId})`]);
    return NextResponse.json({ data: signup }, { status: 201 });
  } catch (error) {
    return orgErrorResponse(error, "SIGNUP_FAILED");
  }
});
