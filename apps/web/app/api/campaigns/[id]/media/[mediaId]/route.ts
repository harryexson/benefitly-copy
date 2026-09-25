import { NextResponse } from "next/server";
import { withUserContext } from "@/lib/database";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export const DELETE = withRouteErrorHandling(async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; mediaId: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });

  const { mediaId } = await params;
  try {
    await withUserContext(session.user.id, (tx) => [tx`select public.remove_campaign_media(${mediaId})`]);
    return NextResponse.json({ data: { removed: true } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not remove media";
    return NextResponse.json({ error: { code: message.includes("not authorized") ? "FORBIDDEN" : "MEDIA_FAILED", message } }, { status: message.includes("not authorized") ? 403 : 400 });
  }
});
