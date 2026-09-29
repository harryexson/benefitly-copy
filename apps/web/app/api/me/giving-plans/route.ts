import { NextRequest, NextResponse } from "next/server";
import { createGivingPlanSchema } from "@benefitly/validation";
import { createGivingPlan } from "@/lib/donor";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export const POST = withRouteErrorHandling(async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createGivingPlanSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_BODY", message: parsed.error.message } }, { status: 400 });

  const plan = await createGivingPlan(session.user.id, {
    campaignId: parsed.data.campaignId,
    category: parsed.data.category,
    amountCents: Math.round(parsed.data.amount * 100),
    currency: parsed.data.currency,
    cadence: parsed.data.cadence,
    annualGoalCents: parsed.data.annualGoal != null ? Math.round(parsed.data.annualGoal * 100) : undefined,
  });
  return NextResponse.json({ data: plan });
});
