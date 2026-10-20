import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "Blog" };

export default function BlogPage() {
  return (
    <>
      <SiteHeader />
      <main className="page legal-page">
        <p className="kicker">Company</p>
        <h1>Blog</h1>
        <p className="lede">Notes on benefit administration, compliance, and building for mutual benefit associations.</p>
        <section className="section legal-section" style={{ paddingBottom: 56 }}>
          <p className="muted">No posts yet &mdash; check back soon.</p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
