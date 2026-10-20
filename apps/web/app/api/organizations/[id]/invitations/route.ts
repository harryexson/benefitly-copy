import { NextRequest, NextResponse } from "next/server";
import { createInvitationSchema } from "@benefitly/validation";
import { withUserContext } from "@/lib/database";
import { isEmailConfigured, sendOrganizationInvitationEmail } from "@/lib/email";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export const GET = withRouteErrorHandling(async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });
  const { id } = await params;
  const [rows] = await withUserContext(session.user.id, (tx) => [
    tx`select id, email, permissions, member_number, membership_level, status, expires_at, created_at from public.organization_invitations where organization_id = ${id} order by created_at desc`,
  ]);
  return NextResponse.json({ data: rows });
});

/**
 * Creates an email-bound invitation and sends it. Refuses before writing anything when email is not
 * configured, so an invitation is never created that nobody can receive.
 */
export const POST = withRouteErrorHandling(async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });
  if (!isEmailConfigured()) {
    return NextResponse.json({ error: { code: "EMAIL_UNAVAILABLE", message: "Email is not configured on this server, so invitations cannot be sent." } }, { status: 503 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = createInvitationSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_BODY", message: parsed.error.message } }, { status: 400 });
  const input = parsed.data;

  let created: { invitation_id: string; token: string }[] | undefined;
  try {
    const [rows] = await withUserContext(session.user.id, (tx) => [
      tx`select * from public.invite_to_organization(${id}, ${input.email}, ${`{${input.permissions.join(",")}}`}::text[], ${input.memberNumber ?? null}, ${input.membershipLevel ?? null})`,
    ]);
    created = rows as unknown as { invitation_id: string; token: string }[];
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create invitation";
    return NextResponse.json({ error: { code: message.includes("not authorized") ? "FORBIDDEN" : "INVITE_FAILED", message } }, { status: message.includes("not authorized") ? 403 : 400 });
  }

  const [[org]] = await withUserContext(session.user.id, (tx) => [tx`select name from public.organizations where id = ${id}`]);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://benefitly-web.vercel.app";
  const invitation = created[0];
  await sendOrganizationInvitationEmail({
    to: input.email,
    organizationName: (org?.name as string) ?? "an organization",
    inviterName: session.user.name,
    acceptUrl: `${baseUrl}/invite?token=${encodeURIComponent(invitation.token)}`,
  });

  return NextResponse.json({ data: { invitationId: invitation.invitation_id, email: input.email } }, { status: 201 });
});
