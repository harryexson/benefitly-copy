import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { AdminOrgPlanSelect } from "@/components/admin-org-plan-select";
import { listOrganizationsAdmin } from "@/lib/admin";
import { listSubscriptionPlans } from "@/lib/associations";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Organizations — back office" };

export default async function AdminOrganizationsPage() {
  const session = await requireSession();
  if (!session) {
    return (
      <>
        <SiteHeader />
        <main className="page">
          <h1>Sign in required</h1>
          <p>
            <Link href="/sign-in">Sign in</Link> with a platform-admin account to view organizations.
          </p>
        </main>
      </>
    );
  }

  let organizations: Awaited<ReturnType<typeof listOrganizationsAdmin>> = [];
  let plans: Awaited<ReturnType<typeof listSubscriptionPlans>> = [];
  let forbidden = false;
  try {
    [organizations, plans] = await Promise.all([listOrganizationsAdmin(session.user.id), listSubscriptionPlans()]);
  } catch {
    forbidden = true;
  }

  return (
    <>
      <SiteHeader />
      <main className="page">
        <p className="kicker">Back office</p>
        <h1>Organizations ({organizations.length})</h1>
        <p className="muted">
          <Link href="/admin">← Back office</Link>
        </p>
        {forbidden && <p className="muted">This page requires a platform-admin account, or the database is unreachable.</p>}

        {!forbidden && (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Organization</th>
                <th>Members</th>
                <th>Total raised</th>
                <th>Created</th>
                <th>Plan</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((org) => (
                <tr key={org.id}>
                  <td>
                    <Link href={`/org/${org.slug}`}>{org.name}</Link>
                  </td>
                  <td>{org.member_count}</td>
                  <td>${(org.total_raised_cents / 100).toLocaleString()}</td>
                  <td>{new Date(org.created_at).toLocaleDateString()}</td>
                  <td>
                    <AdminOrgPlanSelect orgId={org.id} currentTier={org.plan_tier} plans={plans} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </>
  );
}
