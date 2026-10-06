import { NextRequest, NextResponse } from "next/server";
import { organizerRegistrationSchema } from "@benefitly/validation";
import { withUserContext } from "@/lib/database";
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

  const organizationId = input.organizationId ?? null;
  // get_own_payment_account and upsert_payment_account both gate on current_user_id() (an
  // individual's own account) or is_org_member(organization) (an organization's account) --
  // both read from the `app.user_id` setting, which only withUserContext's transaction binds.
  // A previous version of this route called the plain `sql` tag instead, so that binding never
  // happened and upsert_payment_account's own authorization check failed every single call --
  // no organizer, individual or organization, could ever actually finish this step.
  const [[existing], [membership]] = await withUserContext(session.user.id, (tx) => [
    tx`select * from public.get_own_payment_account(${session.user.id}, ${organizationId})`,
    tx`select public.is_org_member(${organizationId}) as is_member`,
  ]);
  if (organizationId && !membership?.is_member) {
    return NextResponse.json({ error: { code: "NOT_AUTHORIZED", message: "You are not a member of this organization." } }, { status: 403 });
  }

  const adapter = paymentProviderRouter.for(input.provider);
  const account = existing?.id
    ? { provider: input.provider, providerAccountId: existing.provider_account_id as string, status: existing.status as string }
    : await adapter.createConnectedAccount({ ownerId: session.user.id, country: input.country, type: input.entityType });

  if (!existing) {
    await withUserContext(session.user.id, (tx) => [
      tx`select public.upsert_payment_account(${organizationId ? null : session.user.id}, ${organizationId}, ${input.provider}, ${account.providerAccountId})`,
    ]);
  }

  const origin = request.nextUrl.origin;
  const params = new URLSearchParams();
  if (organizationId) params.set("organizationId", organizationId);
  // Only ever carry an internal path through to the post-onboarding redirect -- same open-
  // redirect guard as auth-form.tsx, since this value round-trips through Stripe's own domain.
  if (input.redirectTo && input.redirectTo.startsWith("/") && !input.redirectTo.startsWith("//")) params.set("redirect", input.redirectTo);
  const query = params.size ? `?${params.toString()}` : "";
  const onboardingUrl = await adapter.createOnboardingLink(
    account.providerAccountId,
    `${origin}/organizer/onboarding/complete${query}`,
    `${origin}/organizer/onboarding/refresh${query}`,
  );

  return NextResponse.json({ data: { provider: input.provider, providerAccountId: account.providerAccountId, onboardingUrl } }, { status: 201 });
});
