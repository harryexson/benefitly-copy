import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { CreateCampaignForm } from "@/components/create-campaign-form";
import { myOrganizations } from "@/lib/associations";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Start a fundraiser" };

export default async function StartPage({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const session = await requireSession();
  const { org: orgSlug } = await searchParams;

  const organizations = session ? await myOrganizations(session.user.id).catch(() => []) : [];
  const preselected = orgSlug ? organizations.find((o) => o.slug === orgSlug) : undefined;

  return (
    <>
      <SiteHeader />
      <main className="page">
        <p className="kicker">Start a fundraiser</p>
        <h1>{preselected ? `Start a fundraiser for ${preselected.name}.` : "Tell us about your fundraiser."}</h1>
        {session ? (
          <CreateCampaignForm organizations={organizations} preselectedOrgId={preselected?.id} />
        ) : (
          <p className="lede">
            <Link href="/sign-in">Sign in</Link> or <Link href="/sign-up">create an account</Link> to start a fundraiser.
          </p>
        )}
      </main>
    </>
  );
}
