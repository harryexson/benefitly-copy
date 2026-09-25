import { NextRequest, NextResponse } from "next/server";
import { withUserContext } from "@/lib/database";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

/**
 * Registers an Expo push token for the signed-in user. Re-registering the same token (app
 * reopened, token unchanged) is a no-op via the unique constraint; a token moving to a new
 * account (device passed between people) re-points it via the upsert.
 */
export const POST = withRouteErrorHandling(async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });

  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : null;
  const platform = body?.platform === "android" || body?.platform === "web" ? body.platform : "ios";
  if (!token) return NextResponse.json({ error: { code: "INVALID_BODY", message: "A push token is required." } }, { status: 400 });

  await withUserContext(session.user.id, (tx) => [
    tx`
      insert into public.push_tokens (profile_id, token, platform)
      values (${session.user.id}, ${token}, ${platform})
      on conflict (token) do update set profile_id = excluded.profile_id
    `,
  ]);

  return NextResponse.json({ data: { registered: true } }, { status: 201 });
});
