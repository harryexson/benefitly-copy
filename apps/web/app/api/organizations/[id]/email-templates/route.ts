import { NextRequest, NextResponse } from "next/server";
import { emailTemplateSchema } from "@benefitly/validation";
import { withUserContext } from "@/lib/database";
import { orgErrorResponse } from "@/lib/org-api";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export const POST = withRouteErrorHandling(async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = emailTemplateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_BODY", message: parsed.error.message } }, { status: 400 });
  try {
    const [[saved]] = await withUserContext(session.user.id, (tx) => [
      tx`select subject, body from public.upsert_email_template(${id}, 'dues_reminder', ${parsed.data.subject}, ${parsed.data.body})`,
    ]);
    return NextResponse.json({ data: saved }, { status: 201 });
  } catch (error) {
    return orgErrorResponse(error, "TEMPLATE_FAILED");
  }
});
