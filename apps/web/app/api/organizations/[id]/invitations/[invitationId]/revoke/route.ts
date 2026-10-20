import { NextRequest, NextResponse } from "next/server";
import { withUserContext } from "@/lib/database";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export const POST = withRouteErrorHandling(async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string; invitationId: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });

  const { id, invitationId } = await params;
  try {
    await withUserContext(session.user.id, (tx) => [tx`select public.revoke_organization_invitation(${id}, ${invitationId})`]);
    return NextResponse.json({ data: { revoked: true } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not revoke invitation";
    return NextResponse.json({ error: { code: message.includes("not authorized") ? "FORBIDDEN" : "REVOKE_FAILED", message } }, { status: message.includes("not authorized") ? 403 : 400 });
  }
});
