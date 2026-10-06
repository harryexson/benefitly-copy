import { SiteHeader } from "@/components/site-header";
import { OrganizerOnboarding } from "@/components/organizer-onboarding";
import { myOrganizations } from "@/lib/associations";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Resume payouts setup" };

/**
 * Stripe's account link (account_onboarding) expires or can be abandoned partway through -- its
 * refresh_url (set in /api/organizer/register) lands here so a fresh link can be issued, rather
 * than the user getting stuck on an expired Stripe page with no way back into the flow.
 */
export default async function OrganizerOnboardingRefreshPage({
  searchParams,
}: {
  searchParams: Promise<{ organizationId?: string; redirect?: string }>;
}) {
  const session = await requireSession();
  const { organizationId, redirect } = await searchParams;
  const safeRedirect = redirect && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/dashboard";

  let organizationName: string | undefined;
  if (session && organizationId) {
    const organizations = await myOrganizations(session.user.id).catch(() => []);
    organizationName = organizations.find((o) => o.id === organizationId)?.name;
  }

  return (
    <>
      <SiteHeader />
      <main className="page">
        <p className="kicker">Payouts</p>
        <h1>Let&apos;s pick that back up.</h1>
        <p className="lede">Your previous link expired before you finished -- starting again takes a fresh one.</p>
        {session ? (
          <OrganizerOnboarding organizationId={organizationId} legalName={organizationName ?? session.user.name} redirectTo={safeRedirect} mandatory />
        ) : (
          <p className="muted">Sign in to continue setting up payouts.</p>
        )}
      </main>
    </>
  );
}
