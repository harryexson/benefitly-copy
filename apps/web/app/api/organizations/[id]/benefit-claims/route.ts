import { NextRequest, NextResponse } from "next/server";
import { submitBenefitClaimSchema } from "@benefitly/validation";
import { withUserContext } from "@/lib/database";
import { listBenefitClaims } from "@/lib/associations";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export const GET = withRouteErrorHandling(async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });
  const { id } = await params;
  return NextResponse.json({ data: await listBenefitClaims(session.user.id, id) });
});

export const POST = withRouteErrorHandling(async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = submitBenefitClaimSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_BODY", message: parsed.error.message } }, { status: 400 });

  try {
    const [[claim]] = await withUserContext(session.user.id, (tx) => [
      tx`select * from public.submit_benefit_claim(${id}, ${parsed.data.programId}, ${parsed.data.memberId}, ${parsed.data.requestedAmount}, ${parsed.data.reason})`,
    ]);
    return NextResponse.json({ data: claim }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not submit claim";
    return NextResponse.json({ error: { code: message.includes("not authorized") ? "FORBIDDEN" : "CLAIM_FAILED", message } }, { status: message.includes("not authorized") ? 403 : 400 });
  }
});
