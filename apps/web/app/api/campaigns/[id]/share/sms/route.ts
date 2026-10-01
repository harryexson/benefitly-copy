import { NextRequest, NextResponse } from "next/server";
import { shareCampaignSmsSchema } from "@benefitly/validation";
import { getOwnedCampaignById } from "@/lib/organizer";
import { sendCampaignShareSms, isSmsConfigured } from "@/lib/sms";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export const POST = withRouteErrorHandling(async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });

  if (!isSmsConfigured()) {
    return NextResponse.json({ error: { code: "SMS_UNAVAILABLE", message: "Text message invitations are not configured on this server." } }, { status: 503 });
  }

  const { id } = await params;
  const campaign = await getOwnedCampaignById(session.user.id, id).catch(() => null);
  if (!campaign) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Fundraiser not found." } }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = shareCampaignSmsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_BODY", message: parsed.error.message } }, { status: 400 });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const campaignUrl = `${baseUrl}/f/${campaign.slug}`;
  const senderName = session.user.name || "A Benefitly organizer";

  const results = await Promise.allSettled(
    parsed.data.recipients.map((to) => sendCampaignShareSms({ to, senderName, campaignTitle: campaign.title, campaignUrl })),
  );
  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - sent;

  return NextResponse.json({ data: { sent, failed } });
});
