import { NextResponse } from "next/server";
import { listPendingPayouts } from "@/lib/admin";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export const GET = withRouteErrorHandling(async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });
  const payouts = await listPendingPayouts(session.user.id);
  return NextResponse.json({ data: payouts });
});
