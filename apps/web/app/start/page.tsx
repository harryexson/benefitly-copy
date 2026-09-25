import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { CreateCampaignForm } from "@/components/create-campaign-form";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Start a fundraiser" };

export default async function StartPage() {
  const session = await requireSession();

  return (
    <>
      <SiteHeader />
      <main className="page">
        <p className="kicker">Start a fundraiser</p>
        <h1>Tell us about your fundraiser.</h1>
        {session ? (
          <CreateCampaignForm />
        ) : (
          <p className="lede">
            <Link href="/sign-in">Sign in</Link> or <Link href="/sign-up">create an account</Link> to start a fundraiser.
          </p>
        )}
      </main>
    </>
  );
}
