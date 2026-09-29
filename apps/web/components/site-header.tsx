import Link from "next/link";
import Image from "next/image";
import { requireSession } from "@/lib/session";
import { isPlatformAdmin } from "@/lib/admin";
import { SignOutButton } from "@/components/sign-out-button";

export async function SiteHeader() {
  const session = await requireSession();
  const admin = session ? await isPlatformAdmin(session.user.id).catch(() => false) : false;

  return <header className="site-header">
    <Link className="brand" href="/" aria-label="Benefitly home"><Image src="/logo.png" alt="Benefitly" width={169} height={34} priority /></Link>
    <nav aria-label="Main navigation"><Link href="/discover">Discover</Link><Link href="/giving">Giving plan</Link><Link href="/#how-it-works">How it works</Link><Link href="/organizations">For organizations</Link></nav>
    <div className="header-actions">
      {session ? (
        <>
          <Link className="quiet-link" href="/account">Account</Link>
          <Link className="quiet-link" href="/dashboard">Dashboard</Link>
          {admin && <Link className="quiet-link" href="/admin">Admin</Link>}
          <SignOutButton />
        </>
      ) : (
        <>
          <Link className="quiet-link" href="/sign-in">Sign in</Link>
          <Link className="button small" href="/start">Start a fundraiser</Link>
        </>
      )}
    </div>
  </header>;
}
