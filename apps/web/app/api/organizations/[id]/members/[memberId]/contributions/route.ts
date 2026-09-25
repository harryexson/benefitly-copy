import { NextRequest, NextResponse } from "next/server";
import { recordContributionSchema } from "@benefitly/validation";
import { withUserContext } from "@/lib/database";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export const POST = withRouteErrorHandling(async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; memberId: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });

  const { id, memberId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = recordContributionSchema.safeParse({ ...body, memberId });
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_BODY", message: parsed.error.message } }, { status: 400 });

  try {
    const [[contribution]] = await withUserContext(session.user.id, (tx) => [
      tx`select * from public.record_member_contribution(${id}, ${parsed.data.memberId}, ${parsed.data.kind}, ${parsed.data.amount}, ${parsed.data.currency})`,
    ]);
    return NextResponse.json({ data: contribution }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not record contribution";
    return NextResponse.json({ error: { code: message.includes("not authorized") ? "FORBIDDEN" : "CONTRIBUTION_FAILED", message } }, { status: message.includes("not authorized") ? 403 : 400 });
  }
});
