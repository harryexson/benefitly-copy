import { randomBytes, createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { apiKeySchema } from "@benefitly/validation";
import { withUserContext } from "@/lib/database";
import { orgErrorResponse } from "@/lib/org-api";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export const GET = withRouteErrorHandling(async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });
  const { id } = await params;
  const [rows] = await withUserContext(session.user.id, (tx) => [
    tx`select id, name, key_prefix, created_at, revoked_at, last_used_at from public.api_keys where organization_id = ${id} order by created_at desc`,
  ]);
  return NextResponse.json({ data: rows });
});

/** The plaintext key is returned once. Only its SHA-256 hash is stored. */
export const POST = withRouteErrorHandling(async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = apiKeySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_BODY", message: parsed.error.message } }, { status: 400 });

  const key = `bk_live_${randomBytes(24).toString("hex")}`;
  const hash = createHash("sha256").update(key).digest("hex");
  try {
    const [[created]] = await withUserContext(session.user.id, (tx) => [
      tx`select id, name, key_prefix, created_at from public.create_api_key(${id}, ${parsed.data.name}, ${key.slice(0, 12)}, ${hash})`,
    ]);
    return NextResponse.json({ data: { ...(created as object), key } }, { status: 201 });
  } catch (error) {
    return orgErrorResponse(error, "API_KEY_FAILED");
  }
});
