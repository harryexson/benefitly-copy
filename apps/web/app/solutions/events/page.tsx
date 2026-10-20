import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "Events" };

export default function EventsPage() {
  return (
    <>
      <SiteHeader />
      <main className="page legal-page">
        <p className="kicker">Solutions</p>
        <h1>Events &amp; registration</h1>
        <p className="lede">From chapter meetings to annual conferences, with registration tracked per event.</p>
        <section className="section legal-section" style={{ paddingBottom: 56 }}>
          <ul>
            <li>Create an event with a location, start/end time, and optional capacity limit</li>
            <li>Members register directly through their account</li>
            <li>Member-only or public visibility per event</li>
            <li>Announcements to notify your membership when a new event is posted</li>
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
