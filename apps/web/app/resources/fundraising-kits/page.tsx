import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "Fundraising Kits" };

const kits = [
  {
    title: "Campaign launch checklist",
    items: [
      "Write a story that states who benefits and exactly how funds will be used",
      "Set a specific, realistic goal tied to a real cost (repair estimate, claim amount, event budget)",
      "Add at least one photo and, if available, one video",
      "Name a point of contact for questions before you publish",
      "Submit for review — every campaign is checked before it can accept donations",
    ],
  },
  {
    title: "First-week share plan",
    items: [
      "Announce to your full membership through Benefitly's announcement feature",
      "Ask your board or officers to be the first donors and say why publicly",
      "Post one update in week one, even if it's just \"we're live\"",
      "Share the campaign link directly with 10 people who know the cause personally",
    ],
  },
  {
    title: "Update cadence template",
    items: [
      "Week 1: Thank early donors by name (unless anonymous) and share progress toward goal",
      "Midpoint: Post a concrete update — a photo, a receipt, a milestone reached",
      "Close: Share the final outcome and how funds were used",
      "After payout: A short thank-you update closes the loop for donors who want to know their gift mattered",
    ],
  },
  {
    title: "Sample message templates",
    items: [
      "Direct ask: \"[Name] is raising [goal] to [purpose]. Every gift helps, no matter the size — here's the link.\"",
      "Follow-up: \"We're at [percent]% of our goal for [cause]. If you haven't yet, now's a great time.\"",
      "Thank-you: \"Thanks to everyone who gave — we hit our goal and [beneficiary] will receive support for [purpose].\"",
    ],
  },
];

export default function FundraisingKitsPage() {
  return (
    <>
      <SiteHeader />
      <main className="page legal-page">
        <p className="kicker">Resources</p>
        <h1>Fundraising kits</h1>
        <p className="lede">
          Practical checklists and templates for organizers running a campaign on Benefitly. Copy, adapt, and use as
          you launch.
        </p>

        {kits.map((kit) => (
          <section className="section legal-section" key={kit.title} style={{ padding: "24px 0" }}>
            <h2>{kit.title}</h2>
            <ul>
              {kit.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}

        <section className="section legal-section" style={{ padding: "24px 0 56px" }}>
          <p>
            <Link className="button" href="/start">
              Start a fundraiser
            </Link>
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
