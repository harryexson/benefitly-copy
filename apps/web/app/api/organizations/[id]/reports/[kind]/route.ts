import { NextRequest, NextResponse } from "next/server";
import { reportKindSchema } from "@benefitly/validation";
import { withUserContext } from "@/lib/database";
import { toCsv } from "@/lib/csv";
import { orgErrorResponse } from "@/lib/org-api";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export const GET = withRouteErrorHandling(async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string; kind: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });
  const { id, kind } = await params;
  const parsed = reportKindSchema.safeParse(kind);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REPORT", message: "Unknown report." } }, { status: 400 });

  try {
    const rows = await withUserContext(session.user.id, (tx) => [tx`select row_data from public.organization_report(${id}, ${parsed.data}) as row_data`]);
    const records = (rows[0] as unknown as { row_data: Record<string, unknown> }[]).map((row) => row.row_data);
    return new NextResponse(toCsv(records), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${parsed.data}.csv"`,
      },
    });
  } catch (error) {
    return orgErrorResponse(error, "REPORT_FAILED");
  }
});
