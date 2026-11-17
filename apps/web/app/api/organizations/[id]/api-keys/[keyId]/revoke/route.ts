import { NextRequest, NextResponse } from "next/server";
import { withUserContext } from "@/lib/database";
import { orgErrorResponse } from "@/lib/org-api";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export const POST = withRouteErrorHandling(async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string; keyId: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });
  const { id, keyId } = await params;
  try {
    await withUserContext(session.user.id, (tx) => [tx`select public.revoke_api_key(${id}, ${keyId})`]);
    return NextResponse.json({ data: { revoked: true } });
  } catch (error) {
    return orgErrorResponse(error, "REVOKE_FAILED");
  }
});
