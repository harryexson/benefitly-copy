import Link from "next/link";

const columns: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Product",
    links: [
      { label: "Features", href: "/product/features" },
      { label: "Pricing", href: "/product/pricing" },
      { label: "Security", href: "/product/security" },
      { label: "Integrations", href: "/product/integrations" },
    ],
  },
  {
    heading: "Compliance",
    links: [
      { label: "Privacy Policy", href: "/legal/privacy" },
      { label: "Terms of Service", href: "/legal/terms" },
      { label: "Acceptable Use Policy", href: "/legal/acceptable-use" },
      { label: "AML & Compliance", href: "/legal/compliance" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Documentation", href: "/resources/documentation" },
      { label: "API Reference", href: "/resources/api-reference" },
      { label: "Support Center", href: "/resources/support" },
      { label: "Contact Us", href: "/resources/contact" },
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
      <div className="footer-grid">
        <div className="footer-brand">
          <Link className="brand" href="/" aria-label="Benefitly home">
            <span>↗</span> Benefitly
          </Link>
          <p className="muted">Administrative technology for benefits management. Built for verified mutual benefit associations.</p>
        </div>
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
