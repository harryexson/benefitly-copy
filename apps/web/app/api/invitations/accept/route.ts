import { NextRequest, NextResponse } from "next/server";
import { acceptInvitationSchema } from "@benefitly/validation";
import { withUserContext } from "@/lib/database";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";
import { planRefusalCode } from "@/lib/plan-errors";

export const dynamic = "force-dynamic";

export const POST = withRouteErrorHandling(async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to accept this invitation." } }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = acceptInvitationSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_BODY", message: parsed.error.message } }, { status: 400 });

  try {
    const [[membership]] = await withUserContext(session.user.id, (tx) => [
      tx`select * from public.accept_organization_invitation(${parsed.data.token})`,
    ]);
    return NextResponse.json({ data: membership });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not accept invitation";
    const refusal = planRefusalCode(message);
    if (refusal) return NextResponse.json({ error: { code: refusal, message } }, { status: 403 });
    if (message.includes("different email")) return NextResponse.json({ error: { code: "WRONG_ACCOUNT", message } }, { status: 403 });
    if (message.includes("invalid or expired")) return NextResponse.json({ error: { code: "INVITATION_INVALID", message } }, { status: 404 });
    return NextResponse.json({ error: { code: "ACCEPT_FAILED", message } }, { status: 400 });
  }
});
