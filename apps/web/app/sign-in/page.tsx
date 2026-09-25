import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <>
      <SiteHeader />
      <main className="page">
        <p className="kicker">Welcome back</p>
        <h1>Sign in to Benefitly</h1>
        <AuthForm mode="sign-in" />
        <p className="muted">
          New here? <Link href="/sign-up">Create an account</Link>
        </p>
      </main>
    </>
  );
}
