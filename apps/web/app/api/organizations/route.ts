import { NextRequest, NextResponse } from "next/server";
import { createOrganizationSchema } from "@benefitly/validation";
import { withUserContext } from "@/lib/database";
import { myOrganizations } from "@/lib/associations";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export const GET = withRouteErrorHandling(async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });
  return NextResponse.json({ data: await myOrganizations(session.user.id) });
});

export const POST = withRouteErrorHandling(async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to create an organization." } }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createOrganizationSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_BODY", message: parsed.error.message } }, { status: 400 });

  const slug = `${slugify(parsed.data.name)}-${Math.random().toString(36).slice(2, 8)}`;
  const [[organization]] = await withUserContext(session.user.id, (tx) => [tx`select * from public.create_organization(${parsed.data.name}, ${slug})`]);
  return NextResponse.json({ data: organization }, { status: 201 });
});

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}
