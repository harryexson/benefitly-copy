import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Create your account" };

export default function SignUpPage() {
  return (
    <>
      <SiteHeader />
      <main className="page">
        <p className="kicker">Get started</p>
        <h1>Create your Benefitly account</h1>
        <AuthForm mode="sign-up" />
        <p className="muted">
          Already have an account? <Link href="/sign-in">Sign in</Link>
        </p>
      </main>
    </>
  );
}
