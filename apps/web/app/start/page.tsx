import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { CreateCampaignForm } from "@/components/create-campaign-form";
import { myOrganizations } from "@/lib/associations";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Start a fundraiser" };

export default async function StartPage({ searchParams }: { searchParams: Promise<{ org?: string; for?: string }> }) {
  const session = await requireSession();
  const { org: orgSlug, for: forParam } = await searchParams;

  const organizations = session ? await myOrganizations(session.user.id).catch(() => []) : [];
  const preselected = orgSlug ? organizations.find((o) => o.slug === orgSlug) : undefined;

  // Step 1: no choice made yet and no org already picked via a direct link -- ask who this
  // fundraiser is for before showing sign-in or the form, so the org path and the individual
  // path are two clearly separate, equally prominent entry points rather than a buried dropdown.
  if (!orgSlug && forParam !== "individual" && forParam !== "org") {
    return (
      <>
        <SiteHeader />
        <main className="page">
          <p className="kicker">Start a fundraiser</p>
          <h1>Who is this fundraiser for?</h1>
          <div className="admin-nav-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)", maxWidth: 760 }}>
            <Link className="admin-nav-card" href="/start?for=individual">
              <strong>Myself or someone I know</strong>
              <span>A personal fundraiser, reviewed the same way every individual campaign is.</span>
            </Link>
            <Link className="admin-nav-card" href="/start?for=org">
              <strong>My organization</strong>
              <span>Fundraise on behalf of a mutual benefit association or organization you belong to.</span>
            </Link>
          </div>
        </main>
      </>
    );
  }

  // Step 2, org path: resolve who's signed in and what organizations they belong to before
  // showing the campaign form -- an org member picks their org (or creates one); someone with
  // no subscribed organization can still continue as a regular, individually-reviewed fundraiser.
  if (forParam === "org" && !orgSlug) {
    if (!session) {
      return (
        <>
          <SiteHeader />
          <main className="page">
            <p className="kicker">Start a fundraiser for your organization</p>
            <h1>Sign in to continue.</h1>
            <p className="lede">
              If your organization already has a Benefitly account, sign in to pick it and start a fundraiser under
              it. If you don&apos;t have an organization account yet, you can still start a fundraiser right now --
              it will go through the same review as any individual campaign.
            </p>
            <div className="hero-actions" style={{ marginTop: 10 }}>
              <Link className="button" href={`/sign-in?redirect=${encodeURIComponent("/start?for=org")}`}>
                Sign in
              </Link>
              <Link className="button" href={`/sign-up?redirect=${encodeURIComponent("/start?for=org")}`} style={{ background: "#fff", color: "var(--blue)" }}>
                Create an account
              </Link>
            </div>
            <p className="muted" style={{ marginTop: 18 }}>
              <Link href="/start?for=individual">Or just start a fundraiser without an organization →</Link>
            </p>
          </main>
        </>
      );
    }

    if (organizations.length === 0) {
      return (
        <>
          <SiteHeader />
          <main className="page">
            <p className="kicker">Start a fundraiser for your organization</p>
            <h1>You&apos;re not part of an organization yet.</h1>
            <p className="lede">
              Set up your organization&apos;s Benefitly account to manage members, dues, and fundraisers in one
              place -- or skip that for now and start a fundraiser right away, which follows the same review as
              any individual campaign.
            </p>
            <div className="hero-actions" style={{ marginTop: 10 }}>
              <Link className="button" href="/organizations">
                Set up your organization
              </Link>
              <Link className="button" href="/start?for=individual" style={{ background: "#fff", color: "var(--blue)" }}>
                Start a fundraiser now
              </Link>
            </div>
          </main>
        </>
      );
    }

    return (
      <>
        <SiteHeader />
        <main className="page">
          <p className="kicker">Start a fundraiser for your organization</p>
          <h1>Which organization?</h1>
          <div className="admin-nav-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)", maxWidth: 760 }}>
            {organizations.map((org) => (
              <Link className="admin-nav-card" key={org.id} href={`/start?org=${org.slug}`}>
                <strong>{org.name}</strong>
                <span>Start a fundraiser for {org.name}</span>
              </Link>
            ))}
          </div>
        </main>
      </>
    );
  }

  // Step 2, individual path (or an org already resolved via ?org=): sign-in prompt or the form.
  return (
    <>
      <SiteHeader />
      <main className="page">
        <p className="kicker">Start a fundraiser</p>
        <h1>{preselected ? `Start a fundraiser for ${preselected.name}.` : "Tell us about your fundraiser."}</h1>
        {session ? (
          <CreateCampaignForm organizations={organizations} preselectedOrgId={preselected?.id} />
        ) : (
          <>
            <p className="lede">Sign in or create an account to start a fundraiser.</p>
            <div className="hero-actions" style={{ marginTop: 10 }}>
              <Link className="button" href={`/sign-in?redirect=${encodeURIComponent(`/start${orgSlug ? `?org=${orgSlug}` : "?for=individual"}`)}`}>
                Sign in
              </Link>
              <Link
                className="button"
                href={`/sign-up?redirect=${encodeURIComponent(`/start${orgSlug ? `?org=${orgSlug}` : "?for=individual"}`)}`}
                style={{ background: "#fff", color: "var(--blue)" }}
              >
                Create an account
              </Link>
            </div>
          </>
        )}
      </main>
    </>
  );
}
