import { NextResponse } from "next/server";
import { withUserContext } from "@/lib/database";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export const GET = withRouteErrorHandling(async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });

  const [rows] = await withUserContext(session.user.id, (tx) => [
    tx`select id, type, payload, read_at, created_at from public.notifications where profile_id = ${session.user.id} order by created_at desc limit 50`,
  ]);
  return NextResponse.json({ data: rows });
});
