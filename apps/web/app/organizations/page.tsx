import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { CreateOrganizationForm } from "@/components/create-organization-form";
import { myOrganizations } from "@/lib/associations";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Association management" };

export default async function OrganizationsPage() {
  const session = await requireSession();
  const organizations = session ? await myOrganizations(session.user.id).catch(() => []) : [];

  return (
    <>
      <SiteHeader />
      <main className="page">
        <p className="kicker">For organizations</p>
        <h1>Run your association with the same care you bring to your people.</h1>
        <p className="lede">Manage members, dues, benefits, claims, events and community fundraising in a workspace built around accountable decisions.</p>

        {!session && (
          <p>
            <Link className="button" href="/sign-in">
              Sign in to get started
            </Link>
          </p>
        )}

        {session && (
          <>
            {organizations.length > 0 && (
              <section className="section" style={{ padding: "24px 0" }}>
                <h2>Your organizations</h2>
                <div className="campaign-grid">
                  {organizations.map((org) => (
                    <article className="campaign-card" key={org.id}>
                      <div className="campaign-copy">
                        <h3>
                          <Link href={`/org/${org.slug}`}>{org.name}</Link>
                        </h3>
                        <p className="muted">{org.permissions.length} permissions</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
            <section className="section" style={{ padding: "24px 0" }}>
              <h2>Create an organization</h2>
              <CreateOrganizationForm />
            </section>
          </>
        )}
      </main>
    </>
  );
}
