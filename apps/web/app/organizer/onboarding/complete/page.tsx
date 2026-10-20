import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { OrganizerOnboarding } from "@/components/organizer-onboarding";
import { getOwnPaymentAccount } from "@/lib/organizer";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payouts connected" };

/**
 * Stripe's hosted onboarding (account_onboarding account link, created in
 * /api/organizer/register) sends the organizer back here when they finish. Stripe's own
 * `account.updated` webhook (app/api/webhooks/stripe/route.ts) is what actually flips the
 * payment account's status to "active" once charges_enabled/payouts_enabled -- this page just
 * reports whatever that status currently is and continues the user on to where they were headed.
 */
export default async function OrganizerOnboardingCompletePage({
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
            <Link href="/sign-in">Sign in</Link> to check your payout status.
          </p>
        </main>
      </>
    );
  }

  const account = await getOwnPaymentAccount(session.user.id, organizationId).catch(() => undefined);

  return (
    <>
      <SiteHeader />
      <main className="page">
        <p className="kicker">Payouts</p>
        <h1>{account?.status === "active" ? "You're all set." : "Almost there."}</h1>
        {account ? (
          <p className="lede">
            Stripe has your details. Status: <strong>{account.status}</strong>
            {account.status !== "active" && " -- Stripe is still reviewing a few details; this usually clears within minutes, and you can continue in the meantime."}
          </p>
        ) : (
          <p className="lede">We didn&apos;t find a payout account yet. If you closed Stripe&apos;s window partway through, pick up where you left off below.</p>
        )}
        <div className="hero-actions" style={{ marginTop: 10 }}>
          <Link className="button" href={safeRedirect}>
            Continue
          </Link>
        </div>
        {!account && (
          <div style={{ marginTop: 24 }}>
            <OrganizerOnboarding organizationId={organizationId} redirectTo={safeRedirect} mandatory />
          </div>
        )}
      </main>
    </>
  );
}
