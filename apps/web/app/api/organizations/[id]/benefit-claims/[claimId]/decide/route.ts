import { NextRequest, NextResponse } from "next/server";
import { decideBenefitClaimSchema } from "@benefitly/validation";
import { withUserContext } from "@/lib/database";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export const POST = withRouteErrorHandling(async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; claimId: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });

  const { id, claimId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = decideBenefitClaimSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_BODY", message: parsed.error.message } }, { status: 400 });

  try {
    const [[claim]] = await withUserContext(session.user.id, (tx) => [
      tx`select * from public.decide_benefit_claim(${id}, ${claimId}, ${parsed.data.decision}, ${parsed.data.note ?? null})`,
    ]);
    return NextResponse.json({ data: claim });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not decide claim";
    return NextResponse.json({ error: { code: message.includes("not authorized") ? "FORBIDDEN" : "CLAIM_FAILED", message } }, { status: message.includes("not authorized") ? 403 : 400 });
  }
});
