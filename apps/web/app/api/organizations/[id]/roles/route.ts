import { NextRequest, NextResponse } from "next/server";
import { organizationRoleSchema } from "@benefitly/validation";
import { withUserContext } from "@/lib/database";
import { orgErrorResponse, pgArray } from "@/lib/org-api";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export const GET = withRouteErrorHandling(async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });
  const { id } = await params;
  const [rows] = await withUserContext(session.user.id, (tx) => [tx`select id, name, permissions from public.organization_roles where organization_id = ${id} order by name`]);
  return NextResponse.json({ data: rows });
});

export const POST = withRouteErrorHandling(async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = organizationRoleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_BODY", message: parsed.error.message } }, { status: 400 });
  try {
    const [[role]] = await withUserContext(session.user.id, (tx) => [
      tx`select * from public.create_organization_role(${id}, ${parsed.data.name}, ${pgArray(parsed.data.permissions)}::text[])`,
    ]);
    return NextResponse.json({ data: role }, { status: 201 });
  } catch (error) {
    return orgErrorResponse(error, "ROLE_FAILED");
  }
});
