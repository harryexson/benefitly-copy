import { NextRequest, NextResponse } from "next/server";
import { volunteerOpportunitySchema } from "@benefitly/validation";
import { withUserContext } from "@/lib/database";
import { orgErrorResponse } from "@/lib/org-api";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export const GET = withRouteErrorHandling(async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });
  const { id } = await params;
  try {
    const [rows] = await withUserContext(session.user.id, (tx) => [tx`select * from public.volunteer_opportunity_counts(${id})`]);
    return NextResponse.json({ data: rows });
  } catch (error) {
    return orgErrorResponse(error, "VOLUNTEER_FAILED");
  }
});

export const POST = withRouteErrorHandling(async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = volunteerOpportunitySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_BODY", message: parsed.error.message } }, { status: 400 });
  const input = parsed.data;
  try {
    const [[created]] = await withUserContext(session.user.id, (tx) => [
      tx`select * from public.create_volunteer_opportunity(${id}, ${input.title}, ${input.description ?? null}, ${input.startsAt}, ${input.endsAt ?? null}, ${input.location ?? null}, ${input.capacity ?? null})`,
    ]);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    return orgErrorResponse(error, "VOLUNTEER_FAILED");
  }
});
