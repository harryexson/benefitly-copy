import { NextRequest, NextResponse } from "next/server";
import { assignRoleSchema } from "@benefitly/validation";
import { withUserContext } from "@/lib/database";
import { orgErrorResponse } from "@/lib/org-api";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export const POST = withRouteErrorHandling(async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = assignRoleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_BODY", message: parsed.error.message } }, { status: 400 });
  try {
    const [[membership]] = await withUserContext(session.user.id, (tx) => [
      tx`select * from public.assign_organization_role(${id}, ${parsed.data.userId}, ${parsed.data.roleId})`,
    ]);
    return NextResponse.json({ data: membership });
  } catch (error) {
    return orgErrorResponse(error, "ASSIGN_FAILED");
  }
});
