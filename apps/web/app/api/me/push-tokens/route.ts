import { NextRequest, NextResponse } from "next/server";
import { registerPushTokenSchema } from "@benefitly/validation";
import { withUserContext } from "@/lib/database";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export const POST = withRouteErrorHandling(async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = registerPushTokenSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_BODY", message: parsed.error.message } }, { status: 400 });

  await withUserContext(session.user.id, (tx) => [
    tx`
      insert into public.push_tokens (profile_id, token, platform)
      values (${session.user.id}, ${parsed.data.token}, ${parsed.data.platform})
      on conflict (token) do update set profile_id = excluded.profile_id
    `,
  ]);

  return NextResponse.json({ data: { registered: true } }, { status: 201 });
});
