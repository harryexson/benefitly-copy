import { NextRequest, NextResponse } from "next/server";
import { setGivingPlanStatusSchema } from "@benefitly/validation";
import { setGivingPlanStatus } from "@/lib/donor";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export const PATCH = withRouteErrorHandling(async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = setGivingPlanStatusSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_BODY", message: parsed.error.message } }, { status: 400 });

  try {
    const plan = await setGivingPlanStatus(session.user.id, id, parsed.data.status);
    return NextResponse.json({ data: plan });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update giving plan";
    return NextResponse.json({ error: { code: "UPDATE_FAILED", message } }, { status: 400 });
  }
});
