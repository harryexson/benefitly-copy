import { NextRequest, NextResponse } from "next/server";
import { reportScheduleSchema } from "@benefitly/validation";
import { withUserContext } from "@/lib/database";
import { orgErrorResponse } from "@/lib/org-api";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export const GET = withRouteErrorHandling(async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });
  const { id } = await params;
  const [rows] = await withUserContext(session.user.id, (tx) => [
    tx`select id, report_kind, recipient_email, frequency, active, last_sent_at from public.report_schedules where organization_id = ${id} order by created_at`,
  ]);
  return NextResponse.json({ data: rows });
});

export const POST = withRouteErrorHandling(async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = reportScheduleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_BODY", message: parsed.error.message } }, { status: 400 });
  try {
    const [[created]] = await withUserContext(session.user.id, (tx) => [
      tx`select * from public.create_report_schedule(${id}, ${parsed.data.reportKind}, ${parsed.data.recipientEmail}, ${parsed.data.frequency})`,
    ]);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    return orgErrorResponse(error, "SCHEDULE_FAILED");
  }
});
