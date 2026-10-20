import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "Fundraising Ideas" };

const ideas = [
  {
    title: "Emergency assistance drive",
    body: "When a member faces a sudden hardship — a hospital stay, a house fire, a job loss — launch a time-boxed campaign tied to your association's benefit program so the community can respond fast, with the claim workflow already in place for verified disbursement.",
  },
  {
    title: "Annual dues match",
    body: "Ask your board or a sponsoring business to match new-member dues for a limited window. Pair it with a campaign update showing what dues actually fund (claims paid, events held) so the ask has evidence behind it.",
  },
  {
    title: "Scholarship or education fund",
    body: "Faith communities and professional associations often run a standing fund for members pursuing further education or certification. A dedicated campaign with a clear award process builds trust that the fund is used as described.",
  },
  {
    title: "Facility or equipment campaign",
    body: "Meeting halls, chapter houses, and shared equipment need upkeep. A capital campaign with a visible goal and photo updates performs better than a standing donation link — people give more to a project with an end date.",
  },
  {
    title: "Anniversary or milestone giving",
    body: "A chapter's 25th anniversary, a founder's retirement, a member's long service — anchor a campaign to a specific moment your community already cares about.",
  },
  {
    title: "Peer recognition fund",
    body: "Let members nominate a fellow member facing hardship, then run a short campaign in that person's honor. It works because the ask comes from within the community, not from the organization.",
  },
];

export default function FundraisingIdeasPage() {
  return (
    <>
      <SiteHeader />
      <main className="page legal-page">
        <p className="kicker">Resources</p>
        <h1>Fundraising ideas for associations</h1>
        <p className="lede">
          The strongest campaigns on Benefitly tie back to something your members already understand &mdash; a
          benefit program, a shared space, a specific person. Here are starting points that consistently work for
          mutual benefit associations, faith communities, and professional associations.
        </p>

        <section className="section" style={{ padding: "24px 0" }}>
          <div className="campaign-grid">
            {ideas.map((idea) => (
              <article className="campaign-card" key={idea.title}>
                <div className="campaign-copy">
                  <h3>{idea.title}</h3>
                  <p className="muted">{idea.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section legal-section" style={{ padding: "24px 0 56px" }}>
          <p className="muted">
            Ready to put one of these to work? See{" "}
            <Link className="text-link" href="/resources/fundraising-kits">
              Fundraising Kits
            </Link>{" "}
            for templates, or read{" "}
            <Link className="text-link" href="/resources/success-stories">
              Success Stories
            </Link>{" "}
            for how other associations ran theirs.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
