import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getOrganizationBySlug } from "@/lib/associations";
import { loadOperations } from "@/lib/operations";
import { requireSession } from "@/lib/session";
import {
  ApiKeyForm,
  AssignRoleForm,
  BulkPayoutForm,
  DuesReminderButton,
  ReminderTemplateForm,
  RevokeApiKeyButton,
  RoleForm,
  ScheduleForm,
  VolunteerOpportunityForm,
} from "./operations-forms";
import { DEFAULT_DUES_REMINDER } from "@/lib/reminders";

export const dynamic = "force-dynamic";
export const metadata = { title: "Operations" };

const REPORTS = [
  { kind: "members", label: "Members" },
  { kind: "dues", label: "Dues" },
  { kind: "benefit_claims", label: "Benefit claims" },
  { kind: "payouts", label: "Payouts" },
];

export default async function OperationsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await requireSession();
  if (!session) redirect(`/sign-in?redirect=${encodeURIComponent(`/org/${slug}/operations`)}`);

  const org = await getOrganizationBySlug(session.user.id, slug).catch(() => null);
  if (!org) notFound();

  const can = (permission: string) => org.permissions.includes(permission);
  const data = await loadOperations(session.user.id, org.id);
  const template = data.reminderTemplate ?? DEFAULT_DUES_REMINDER;

  return (
    <>
      <SiteHeader />
      <main className="page">
        <p className="kicker">{org.name}</p>
        <h1>Operations</h1>
        <p>
          <Link href={`/org/${slug}`}>Back to the organization</Link> · <Link href={`/org/${slug}/billing`}>Plan &amp; billing</Link>
        </p>
        {data.unavailable.length > 0 && (
          <p className="muted">
            Not available for your account or plan: {data.unavailable.join(", ")}. Growth and Scale unlock these tools; managers with the right permission can use them.
          </p>
        )}

        {(can("members.manage") || can("finance.manage")) && (
          <section className="section" style={{ padding: "24px 0" }}>
            <h2>Reports (CSV)</h2>
            <ul>
              {REPORTS.map((report) => (
                <li key={report.kind}>
                  <a href={`/api/organizations/${org.id}/reports/${report.kind}`}>Download {report.label}</a>
                </li>
              ))}
            </ul>
            <h3>Scheduled report emails</h3>
            {data.schedules.map((schedule) => (
              <p key={schedule.id} className="muted">
                {schedule.report_kind} → {schedule.recipient_email}, {schedule.frequency}
                {schedule.last_sent_at ? `, last sent ${new Date(schedule.last_sent_at).toLocaleDateString()}` : ""}
              </p>
            ))}
            <ScheduleForm orgId={org.id} />
          </section>
        )}

        {(can("communications.manage") || can("finance.manage")) && (
          <section className="section" style={{ padding: "24px 0" }}>
            <h2>Dues reminders</h2>
            <p className="muted">Emails members with a contact email and no paid dues in the past 12 months.</p>
            <DuesReminderButton orgId={org.id} />
            {can("communications.manage") && (
              <>
                <h3>Reminder wording</h3>
                <ReminderTemplateForm orgId={org.id} subject={template.subject} body={template.body} />
              </>
            )}
          </section>
        )}

        {can("events.manage") && (
          <section className="section" style={{ padding: "24px 0" }}>
            <h2>Volunteer opportunities</h2>
            {data.opportunities.length === 0 && <p className="muted">No opportunities yet.</p>}
            <ul>
              {data.opportunities.map((opp) => (
                <li key={opp.id}>
                  {opp.title} · {new Date(opp.starts_at).toLocaleString()}{opp.location ? ` · ${opp.location}` : ""} · {opp.confirmed_count}
                  {opp.capacity != null ? ` of ${opp.capacity}` : ""} signed up
                </li>
              ))}
            </ul>
            <VolunteerOpportunityForm orgId={org.id} />
          </section>
        )}

        {can("benefits.manage") || can("finance.manage") ? (
          <section className="section" style={{ padding: "24px 0" }}>
            <h2>Bulk benefit payouts</h2>
            <p className="muted">Creates pending payouts for approved claims. An approver with payouts.approve still reviews each one before any money moves.</p>
            <BulkPayoutForm orgId={org.id} />
          </section>
        ) : null}

        {can("organization.manage") && (
          <section className="section" style={{ padding: "24px 0" }}>
            <h2>Roles</h2>
            <ul>
              {data.roles.map((role) => (
                <li key={role.id}>{role.name}: {role.permissions.join(", ")}</li>
              ))}
            </ul>
            <RoleForm orgId={org.id} />
            <h3>Assign a role</h3>
            <AssignRoleForm orgId={org.id} roles={data.roles} />

            <h2>API keys</h2>
            <p className="muted">Read-only keys for member data. Keys are shown once.</p>
            <ul>
              {data.apiKeys.map((key) => (
                <li key={key.id}>
                  {key.name} ({key.key_prefix}…){key.revoked_at ? " · revoked" : ""}{" "}
                  {!key.revoked_at && <RevokeApiKeyButton orgId={org.id} keyId={key.id} />}
                </li>
              ))}
            </ul>
            <ApiKeyForm orgId={org.id} />
          </section>
        )}
      </main>
    </>
  );
}
