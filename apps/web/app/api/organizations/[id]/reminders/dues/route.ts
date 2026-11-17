import { NextRequest, NextResponse } from "next/server";
import { withUserContext } from "@/lib/database";
import { isEmailConfigured, sendDuesReminderEmail } from "@/lib/email";
import { DEFAULT_DUES_REMINDER, renderTemplate } from "@/lib/reminders";
import { orgErrorResponse } from "@/lib/org-api";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";
const MAX_RECIPIENTS_PER_REQUEST = 500;

/** Emails members with no paid dues in the past twelve months. Plan-gated in the database. */
export const POST = withRouteErrorHandling(async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });
  if (!isEmailConfigured()) return NextResponse.json({ error: { code: "EMAIL_UNAVAILABLE", message: "Email is not configured on this server." } }, { status: 503 });

  const { id } = await params;
  let recipients: { member_name: string; email: string; organization_name: string }[];
  let template: { subject: string; body: string };
  try {
    const [rows, templateRows] = await withUserContext(session.user.id, (tx) => [
      tx`select member_id, member_name, email, organization_name from public.dues_reminder_recipients(${id})`,
      tx`select subject, body from public.organization_email_template(${id}, 'dues_reminder')`,
    ]);
    recipients = rows as unknown as typeof recipients;
    template = (templateRows[0] as unknown as typeof template) ?? DEFAULT_DUES_REMINDER;
  } catch (error) {
    return orgErrorResponse(error, "REMINDER_FAILED");
  }

  const batch = recipients.slice(0, MAX_RECIPIENTS_PER_REQUEST);
  let sent = 0;
  let failed = 0;
  for (const recipient of batch) {
    const values = { name: recipient.member_name, organization: recipient.organization_name };
    try {
      await sendDuesReminderEmail({
        to: recipient.email,
        subject: renderTemplate(template.subject, values),
        text: renderTemplate(template.body, values),
      });
      sent += 1;
    } catch {
      failed += 1;
    }
  }

  return NextResponse.json({ data: { sent, failed, remaining: recipients.length - batch.length } });
});
