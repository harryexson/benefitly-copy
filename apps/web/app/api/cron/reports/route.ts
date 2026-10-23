import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/database";
import { sendReportEmail } from "@/lib/email";
import { toCsv } from "@/lib/csv";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

/** Sends each due scheduled report. Vercel Cron calls this with Authorization: Bearer $CRON_SECRET. */
export const GET = withRouteErrorHandling(async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authorized." } }, { status: 401 });
  }

  const due = await sql`select * from public.due_report_schedules()`;
  let sent = 0;
  let failed = 0;
  for (const schedule of due as unknown as { id: string; organization_id: string; report_kind: string; recipient_email: string }[]) {
    try {
      const rows = await sql`select row_data from public.schedule_report_rows(${schedule.organization_id}, ${schedule.report_kind}) as row_data`;
      const csv = toCsv(rows.map((row) => (row as { row_data: Record<string, unknown> }).row_data));
      await sendReportEmail({
        to: schedule.recipient_email,
        subject: `Your Benefitly ${schedule.report_kind.replace("_", " ")} report`,
        filename: `${schedule.report_kind}.csv`,
        csv,
      });
      await sql`select public.mark_report_sent(${schedule.id})`;
      sent += 1;
    } catch {
      failed += 1;
    }
  }
  return NextResponse.json({ data: { sent, failed } });
});
