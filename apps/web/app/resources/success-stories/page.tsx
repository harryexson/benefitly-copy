import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "Success Stories" };

const stories = [
  {
    category: "Mutual benefit association",
    title: "Turning a claims backlog into a same-week process",
    body: "A member-run benefit association moving off spreadsheets used Benefitly's claim workflow to give every member a clear submission process and a documented decision, cutting the time from claim to decision from weeks to days.",
  },
  {
    category: "Faith community",
    title: "A building fund members could actually track",
    body: "A congregation running a multi-year facility campaign used campaign updates to show donors exactly what each phase of construction cost, keeping giving steady through the full project instead of dropping off after the launch.",
  },
  {
    category: "Professional association",
    title: "Dues, events, and a scholarship fund in one place",
    body: "A professional association consolidated dues tracking, annual conference registration, and a member scholarship campaign into a single workspace instead of three disconnected tools.",
  },
];

export default function SuccessStoriesPage() {
  return (
    <>
      <SiteHeader />
      <main className="page legal-page">
        <p className="kicker">Resources</p>
        <h1>Success stories</h1>
        <p className="lede">
          Illustrative examples of the kind of impact Benefitly is built to support &mdash; composite scenarios based
          on how associations use the platform, not verified customer case studies. We&apos;ll replace these with
          real, named stories as associations agree to share them.
        </p>

        <section className="section" style={{ padding: "24px 0 56px" }}>
          <div className="campaign-grid">
            {stories.map((story) => (
              <article className="campaign-card" key={story.title}>
                <div className="campaign-copy">
                  <p className="category">{story.category}</p>
                  <h3>{story.title}</h3>
                  <p className="muted">{story.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
