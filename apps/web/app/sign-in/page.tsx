import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ redirect?: string }> }) {
  const { redirect } = await searchParams;
  return (
    <>
      <SiteHeader />
      <main className="page">
        <p className="kicker">Welcome back</p>
        <h1>Sign in to Benefitly</h1>
        <AuthForm mode="sign-in" redirectTo={redirect} />
        <p className="muted">
          <Link href="/forgot-password">Forgot your password?</Link>
        </p>
        <p className="muted">
          New here? <Link href={redirect ? `/sign-up?redirect=${encodeURIComponent(redirect)}` : "/sign-up"}>Create an account</Link>
        </p>
      </main>
    </>
  );
}
