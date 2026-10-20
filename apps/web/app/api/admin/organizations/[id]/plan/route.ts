import { NextRequest, NextResponse } from "next/server";
import { setOrganizationPlanSchema } from "@benefitly/validation";
import { isPlatformAdmin, adminSetOrganizationPlan } from "@/lib/admin";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export const POST = withRouteErrorHandling(async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });
  if (!(await isPlatformAdmin(session.user.id))) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Platform admin access required." } }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = setOrganizationPlanSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_BODY", message: parsed.error.message } }, { status: 400 });

  try {
    const organization = await adminSetOrganizationPlan(session.user.id, id, parsed.data.tier);
    return NextResponse.json({ data: organization });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not change plan";
    return NextResponse.json({ error: { code: message.includes("not authorized") ? "FORBIDDEN" : "PLAN_CHANGE_FAILED", message } }, { status: message.includes("not authorized") ? 403 : 400 });
  }
});
