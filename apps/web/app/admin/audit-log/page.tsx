import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { listAuditLog } from "@/lib/admin";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit log — back office" };

export default async function AdminAuditLogPage() {
  const session = await requireSession();
  if (!session) {
    return (
      <>
        <SiteHeader />
        <main className="page">
          <h1>Sign in required</h1>
          <p>
            <Link href="/sign-in">Sign in</Link> with a platform-admin account to view the audit log.
          </p>
        </main>
      </>
    );
  }

  let entries: Awaited<ReturnType<typeof listAuditLog>> = [];
  let forbidden = false;
  try {
    entries = await listAuditLog(session.user.id, 200);
  } catch {
    forbidden = true;
  }

  return (
    <>
      <SiteHeader />
      <main className="page">
        <p className="kicker">Back office</p>
        <h1>Audit log</h1>
        <p className="muted">
          <Link href="/admin">← Back office</Link>
        </p>
        <p className="muted">Most recent 200 recorded actions, platform-wide.</p>
        {forbidden && <p className="muted">This page requires a platform-admin account, or the database is unreachable.</p>}

        {!forbidden && (
          <>
            {entries.length === 0 && <p className="muted">No audit log entries recorded yet.</p>}
            {entries.length > 0 && (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Action</th>
                    <th>Resource</th>
                    <th>Actor</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{new Date(entry.created_at).toLocaleString()}</td>
                      <td>{entry.action}</td>
                      <td>
                        {entry.resource_type}
                        {entry.resource_id ? ` · ${entry.resource_id.slice(0, 8)}` : ""}
                      </td>
                      <td>{entry.actor_id ? entry.actor_id.slice(0, 8) : "system"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </main>
    </>
  );
}
