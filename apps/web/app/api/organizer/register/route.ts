import { NextRequest, NextResponse } from "next/server";
import { organizerRegistrationSchema } from "@benefitly/validation";
import { sql } from "@/lib/database";
import { paymentProviderRouter } from "@/lib/payments";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

/**
 * Organizer registration + payment-provider onboarding, in one step: create (or reuse) the
 * connected account, persist its id, and return a hosted onboarding link for the organizer to
 * complete identity verification and bank details directly with the provider.
 */
export const POST = withRouteErrorHandling(async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to register as an organizer." } }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = organizerRegistrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "INVALID_BODY", message: parsed.error.message } }, { status: 400 });
  }
  const input = parsed.data;

  if (!paymentProviderRouter.isConfigured(input.provider)) {
    return NextResponse.json({ error: { code: "PROVIDER_UNAVAILABLE", message: `${input.provider} is not configured on this server.` } }, { status: 503 });
  }

  const [existing] = await sql`select * from public.get_own_payment_account(${session.user.id}, null)`;
  const adapter = paymentProviderRouter.for(input.provider);

  const account = existing?.id
    ? { provider: input.provider, providerAccountId: existing.provider_account_id, status: existing.status }
    : await adapter.createConnectedAccount({ ownerId: session.user.id, country: input.country, type: input.entityType });

  if (!existing) {
    await sql`select public.upsert_payment_account(${session.user.id}, null, ${input.provider}, ${account.providerAccountId})`;
  }

  const origin = request.nextUrl.origin;
  const onboardingUrl = await adapter.createOnboardingLink(
    account.providerAccountId,
    `${origin}/organizer/onboarding/complete`,
    `${origin}/organizer/onboarding/refresh`,
  );

  return NextResponse.json({ data: { provider: input.provider, providerAccountId: account.providerAccountId, onboardingUrl } }, { status: 201 });
});
