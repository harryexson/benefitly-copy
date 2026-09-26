import Link from "next/link";
import Image from "next/image";

const columns: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Solutions",
    links: [
      { label: "Membership management", href: "/solutions/membership-management" },
      { label: "Dues & contributions", href: "/solutions/dues-and-contributions" },
      { label: "Benefit programs & claims", href: "/solutions/benefit-programs" },
      { label: "Events", href: "/solutions/events" },
      { label: "Community fundraising", href: "/solutions/fundraising" },
      { label: "Pricing", href: "/product/pricing" },
    ],
  },
  {
    heading: "Platform",
    links: [
      { label: "Features overview", href: "/product/features" },
      { label: "Security & scalability", href: "/product/security" },
      { label: "Integrations", href: "/product/integrations" },
      { label: "Reporting", href: "/platform/reporting" },
      { label: "Federated accounts", href: "/platform/federated-accounts" },
    ],
  },
  {
    heading: "Compliance",
    links: [
      { label: "Privacy Policy", href: "/legal/privacy" },
      { label: "Terms of Service", href: "/legal/terms" },
      { label: "Organization Agreement", href: "/legal/organization-agreement" },
      { label: "Acceptable Use Policy", href: "/legal/acceptable-use" },
      { label: "AML & Compliance", href: "/legal/compliance" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Documentation", href: "/resources/documentation" },
      { label: "API Reference", href: "/resources/api-reference" },
      { label: "Fundraising ideas", href: "/resources/fundraising-ideas" },
      { label: "Fundraising kits", href: "/resources/fundraising-kits" },
      { label: "Success stories", href: "/resources/success-stories" },
      { label: "Support Center", href: "/resources/support" },
      { label: "Contact Us", href: "/resources/contact" },
    ],
  },
  {
    heading: "Who we serve",
    links: [
      { label: "Mutual benefit associations", href: "/who-we-serve/mutual-benefit-associations" },
      { label: "Faith communities", href: "/who-we-serve/faith-communities" },
      { label: "Professional associations", href: "/who-we-serve/professional-associations" },
      { label: "Community & emergency funds", href: "/who-we-serve/community-funds" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About Us", href: "/company/about" },
      { label: "Blog", href: "/company/blog" },
      { label: "Careers", href: "/company/careers" },
      { label: "Press Kit", href: "/company/press" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <Link className="brand" href="/" aria-label="Benefitly home">
          <Image src="/logo.png" alt="Benefitly" width={169} height={34} />
        </Link>
        <p className="muted">Administrative technology for benefits management. Built for verified mutual benefit associations.</p>
      </div>
      <div className="footer-grid">
        {columns.map((col) => (
          <div key={col.heading} className="footer-col">
            <h4>{col.heading}</h4>
            <ul>
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Benefitly</span>
        <span>Not a payment processor, money transmitter, or financial institution.</span>
      </div>
    </footer>
  );
}
