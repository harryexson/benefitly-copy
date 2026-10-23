import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/database";
import { planRefusalCode } from "@/lib/plan-errors";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

/** Read-only member list for API keys. The bearer key is the credential; the database checks it. */
export const GET = withRouteErrorHandling(async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const header = request.headers.get("authorization") ?? "";
  const key = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!key) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Send your API key as a Bearer token." } }, { status: 401 });

  const { id } = await params;
  const hash = createHash("sha256").update(key).digest("hex");
  try {
    const rows = await sql`select * from public.api_list_members(${id}, ${hash})`;
    return NextResponse.json({ data: rows.map((row) => (row as { api_list_members: unknown }).api_list_members) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    const refusal = planRefusalCode(message);
    if (refusal) return NextResponse.json({ error: { code: refusal, message } }, { status: 403 });
    if (message.includes("invalid API key")) return NextResponse.json({ error: { code: "INVALID_KEY", message: "This API key is not valid for this organization." } }, { status: 401 });
    throw error;
  }
});
