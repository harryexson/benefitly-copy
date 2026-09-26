import Link from "next/link";

export function SiteHeader() {
  return <header className="site-header">
    <Link className="brand" href="/" aria-label="Benefitly home"><span>↗</span> Benefitly</Link>
    <nav aria-label="Main navigation"><Link href="/discover">Discover</Link><Link href="/giving">Giving plan</Link><Link href="/#how-it-works">How it works</Link><Link href="/organizations">For organizations</Link></nav>
    <div className="header-actions"><Link className="quiet-link" href="/sign-in">Sign in</Link><Link className="button small" href="/start">Start a fundraiser</Link></div>
  </header>;
}
