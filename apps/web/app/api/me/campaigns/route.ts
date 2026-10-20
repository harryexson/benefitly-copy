import { NextResponse } from "next/server";
import { listOwnedCampaigns, getOwnPaymentAccount } from "@/lib/organizer";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

/**
 * HTTP equivalent of apps/web/app/dashboard/page.tsx's server-side queries, for clients (the
 * Expo app) that only have network access to the shared backend, not the database.
 */
export const GET = withRouteErrorHandling(async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });

  const [campaigns, paymentAccount] = await Promise.all([listOwnedCampaigns(session.user.id), getOwnPaymentAccount(session.user.id)]);
  return NextResponse.json({ data: { campaigns, paymentAccount: paymentAccount ?? null } });
});
