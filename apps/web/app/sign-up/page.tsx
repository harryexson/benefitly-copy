import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Create your account" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ redirect?: string }> }) {
  const { redirect } = await searchParams;
  return (
    <>
      <SiteHeader />
      <main className="page">
        <p className="kicker">Get started</p>
        <h1>Create your Benefitly account</h1>
        <AuthForm mode="sign-up" redirectTo={redirect} />
        <p className="muted">
          Already have an account? <Link href={redirect ? `/sign-in?redirect=${encodeURIComponent(redirect)}` : "/sign-in"}>Sign in</Link>
        </p>
      </main>
    </>
  );
}
