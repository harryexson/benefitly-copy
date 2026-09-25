import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { AddMemberForm } from "@/components/add-member-form";
import { RecordContributionButton } from "@/components/record-contribution-button";
import { CreateBenefitProgramForm } from "@/components/create-benefit-program-form";
import { SubmitClaimForm } from "@/components/submit-claim-form";
import { DecideClaimButtons } from "@/components/decide-claim-buttons";
import { CreateEventForm } from "@/components/create-event-form";
import { RegisterEventButton } from "@/components/register-event-button";
import { PostAnnouncementForm } from "@/components/post-announcement-form";
import { getOrganizationBySlug, listMembers, listBenefitPrograms, listBenefitClaims, listEvents, listAnnouncements, myMembershipInOrg } from "@/lib/associations";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function OrganizationWorkspacePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await requireSession();
  if (!session) {
    return (
      <>
        <SiteHeader />
        <main className="page">
          <h1>Sign in required</h1>
          <p>
            <Link href="/sign-in">Sign in</Link> to view this organization workspace.
          </p>
        </main>
      </>
    );
  }

  const org = await getOrganizationBySlug(session.user.id, slug).catch(() => null);
  if (!org) notFound();

  const canManageMembers = org.permissions.includes("members.manage");
  const canManageFinance = org.permissions.includes("finance.manage");
  const canManageBenefits = org.permissions.includes("benefits.manage");
  const canManageEvents = org.permissions.includes("events.manage");
  const canManageComms = org.permissions.includes("communications.manage");

  const [members, programs, claims, events, announcements, myMembership] = await Promise.all([
    listMembers(session.user.id, org.id).catch(() => []),
    listBenefitPrograms(session.user.id, org.id).catch(() => []),
    listBenefitClaims(session.user.id, org.id).catch(() => []),
    listEvents(session.user.id, org.id).catch(() => []),
    listAnnouncements(session.user.id, org.id).catch(() => []),
    myMembershipInOrg(session.user.id, org.id).catch(() => null),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="page">
        <p className="kicker">Organization</p>
        <h1>{org.name}</h1>

        <section className="section" style={{ padding: "24px 0" }}>
          <h2>Members ({members.length})</h2>
          {canManageMembers && <AddMemberForm orgId={org.id} />}
          {members.map((member) => (
            <div key={member.id} className="campaign-card" style={{ padding: 14, marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>{member.member_number}</strong> {member.membership_level ? `· ${member.membership_level}` : ""}
                <p className="muted">{member.status}</p>
              </div>
              {canManageFinance && <RecordContributionButton orgId={org.id} memberId={member.id} />}
            </div>
          ))}
          {members.length === 0 && <p className="muted">No members yet.</p>}
        </section>

        <section className="section" style={{ padding: "24px 0" }}>
          <h2>Benefit programs</h2>
          {canManageBenefits && <CreateBenefitProgramForm orgId={org.id} />}
          <div className="campaign-grid" style={{ marginTop: 12 }}>
            {programs.map((program) => (
              <article className="campaign-card" key={program.id}>
                <div className="campaign-copy">
                  <h3>{program.name}</h3>
                  <p className="muted">{program.description}</p>
                  {program.maximum_amount != null && <p>Up to ${(program.maximum_amount / 100).toLocaleString()}</p>}
                </div>
              </article>
            ))}
          </div>
          {programs.length === 0 && <p className="muted">No benefit programs yet.</p>}
        </section>

        <section className="section" style={{ padding: "24px 0" }}>
          <h2>Benefit claims</h2>
          <SubmitClaimForm orgId={org.id} programs={programs} members={members} />
          {claims.map((claim) => (
            <div key={claim.id} className="campaign-card" style={{ padding: 14, marginTop: 10 }}>
              <p>
                <strong>{claim.member_number}</strong> requested ${(claim.requested_amount / 100).toLocaleString()} from {claim.program_name} —{" "}
                <span className="muted">{claim.status}</span>
              </p>
              <p className="muted">{claim.reason}</p>
              {canManageBenefits && claim.status === "submitted" && <DecideClaimButtons orgId={org.id} claimId={claim.id} />}
            </div>
          ))}
          {claims.length === 0 && <p className="muted">No claims yet.</p>}
        </section>

        <section className="section" style={{ padding: "24px 0" }}>
          <h2>Events</h2>
          {canManageEvents && <CreateEventForm orgId={org.id} />}
          <div className="campaign-grid" style={{ marginTop: 12 }}>
            {events.map((event) => (
              <article className="campaign-card" key={event.id}>
                <div className="campaign-copy">
                  <h3>{event.title}</h3>
                  <p className="muted">
                    {new Date(event.starts_at).toLocaleString()} {event.location ? `· ${event.location}` : ""}
                  </p>
                  <p className="muted">
                    {event.registration_count}
                    {event.capacity ? ` / ${event.capacity}` : ""} registered
                  </p>
                  {myMembership && <RegisterEventButton orgId={org.id} eventId={event.id} memberId={myMembership.id} />}
                </div>
              </article>
            ))}
          </div>
          {events.length === 0 && <p className="muted">No events yet.</p>}
        </section>

        <section className="section" style={{ padding: "24px 0" }}>
          <h2>Announcements</h2>
          {canManageComms && <PostAnnouncementForm orgId={org.id} />}
          {announcements.map((announcement) => (
            <div key={announcement.id} className="campaign-card" style={{ padding: 14, marginTop: 10 }}>
              <h3>{announcement.title}</h3>
              <p style={{ whiteSpace: "pre-wrap" }}>{announcement.body}</p>
            </div>
          ))}
          {announcements.length === 0 && <p className="muted">No announcements yet.</p>}
        </section>
      </main>
    </>
  );
}
