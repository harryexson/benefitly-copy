import { NextRequest, NextResponse } from "next/server";
import { reportCampaignSchema } from "@benefitly/validation";
import { sql, withUserContext } from "@/lib/database";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: campaignId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = reportCampaignSchema.safeParse({ ...body, campaignId });
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "INVALID_BODY", message: parsed.error.message } }, { status: 400 });
  }
  const input = parsed.data;
  const session = await requireSession();

  let report: { id: string; status: string };
  if (session) {
    const [[row]] = await withUserContext(session.user.id, (tx) => [
      tx`
        insert into public.campaign_reports (campaign_id, reporter_id, reason, details)
        values (${input.campaignId}, ${session.user.id}, ${input.reason}, ${input.details ?? null})
        returning id, status
      `,
    ]);
    report = row as { id: string; status: string };
  } else {
    const [row] = await sql`
      insert into public.campaign_reports (campaign_id, reporter_id, reason, details)
      values (${input.campaignId}, null, ${input.reason}, ${input.details ?? null})
      returning id, status
    `;
    report = row as { id: string; status: string };
  }

  return NextResponse.json({ data: report }, { status: 201 });
}
