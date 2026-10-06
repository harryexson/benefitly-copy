import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { OrganizerOnboarding } from "@/components/organizer-onboarding";
import { getOwnPaymentAccount } from "@/lib/organizer";
import { getOrganizationBySlug, myOrganizations } from "@/lib/associations";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Set up payouts" };

/**
 * The mandatory payout-setup step every individual and organization must complete before using
 * the rest of the platform -- linked to right after sign-up (auth-form.tsx) and right after
 * creating an organization (create-organization-form.tsx), never skippable from either entry
 * point. If a payment account already exists for this scope (e.g. the user came back after
 * already finishing it), this continues straight through instead of showing the form again.
 */
export default async function OrganizerOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ organizationId?: string; redirect?: string }>;
}) {
  const session = await requireSession();
  const { organizationId, redirect } = await searchParams;
  const safeRedirect = redirect && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/dashboard";

  if (!session) {
    return (
      <>
        <SiteHeader />
        <main className="page">
          <h1>Sign in required</h1>
          <p>
            <Link href={`/sign-in?redirect=${encodeURIComponent(`/organizer/onboarding${organizationId ? `?organizationId=${organizationId}` : ""}`)}`}>
              Sign in
            </Link>{" "}
            to set up payouts.
          </p>
        </main>
      </>
    );
  }

  let organizationName: string | undefined;
  if (organizationId) {
    const organizations = await myOrganizations(session.user.id).catch(() => []);
    const match = organizations.find((o) => o.id === organizationId);
    if (!match) {
      return (
        <>
          <SiteHeader />
          <main className="page">
            <h1>Organization not found</h1>
            <p className="muted">You aren&apos;t a member of this organization.</p>
          </main>
        </>
      );
    }
    organizationName = match.name;
  }

  const existing = await getOwnPaymentAccount(session.user.id, organizationId).catch(() => undefined);
  if (existing) {
    return (
      <>
        <SiteHeader />
        <main className="page">
          <p className="kicker">Set up payouts</p>
          <h1>Payouts are already set up{organizationName ? ` for ${organizationName}` : ""}.</h1>
          <p className="muted">Status: {existing.status}</p>
          <p style={{ marginTop: 16 }}>
            <Link className="button" href={safeRedirect}>
              Continue
            </Link>
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="page">
        <p className="kicker">One last step</p>
        <h1>{organizationName ? `Set up payouts for ${organizationName}.` : "Set up your payouts."}</h1>
        <p className="lede">
          Benefitly never holds or pools funds -- donations, dues, and ticket sales go straight through Stripe to
          your own connected account. Every individual and organization completes this once, right after sign-up,
          before using the rest of the platform.
        </p>
        <OrganizerOnboarding organizationId={organizationId} legalName={organizationName ?? session.user.name} redirectTo={safeRedirect} mandatory />
      </main>
    </>
  );
}
