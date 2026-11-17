import { SiteHeader } from "@/components/site-header";
import { ResetPasswordForm } from "@/components/reset-password-form";

export const metadata = { title: "Choose a new password" };

// Better Auth redirects here with ?token=... on success, or ?error=INVALID_TOKEN when the link is
// expired or has already been used.
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  return (
    <>
      <SiteHeader />
      <main className="page">
        <p className="kicker">Account help</p>
        <h1>Choose a new password</h1>
        <ResetPasswordForm token={token ?? null} linkError={error === "INVALID_TOKEN"} />
      </main>
    </>
  );
}
