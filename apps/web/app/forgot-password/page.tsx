import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export const metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <SiteHeader />
      <main className="page">
        <p className="kicker">Account help</p>
        <h1>Reset your password</h1>
        <p className="muted">Enter the email address on your Benefitly account, whether it is an individual or an organization account.</p>
        <ForgotPasswordForm />
        <p className="muted">
          Remembered it? <Link href="/sign-in">Sign in</Link>
        </p>
      </main>
    </>
  );
}
