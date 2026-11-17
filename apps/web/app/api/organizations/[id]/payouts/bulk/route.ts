import { NextRequest, NextResponse } from "next/server";
import { bulkPayoutSchema } from "@benefitly/validation";
import { withUserContext } from "@/lib/database";
import { orgErrorResponse, pgArray } from "@/lib/org-api";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

/** Starts pending payouts for many approved benefit claims. Approval and Stripe transfers remain separate steps. */
export const POST = withRouteErrorHandling(async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });
  const body = await request.json().catch(() => null);
  const parsed = bulkPayoutSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_BODY", message: parsed.error.message } }, { status: 400 });
  try {
    const rows = await withUserContext(session.user.id, (tx) => [
      tx`select * from public.initiate_benefit_payouts(${pgArray(parsed.data.claimIds)}::uuid[], ${parsed.data.sourceAccountId})`,
    ]);
    return NextResponse.json({ data: rows[0] }, { status: 201 });
  } catch (error) {
    return orgErrorResponse(error, "BULK_PAYOUT_FAILED");
  }
});
