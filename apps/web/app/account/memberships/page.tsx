import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { withUserContext } from "@/lib/database";
import { requireSession } from "@/lib/session";
import { DuesPayment } from "./dues-payment";

export const dynamic = "force-dynamic";
export const metadata = { title: "My memberships" };

type Membership = {
  member_id: string; org_name: string; org_slug: string; member_number: string; membership_level: string | null;
  status: string; dues_amount: number | null; currency: string; paid_current: boolean; last_paid_at: string | null;
};
type Claim = { claim_id: string; organization_name: string; program_name: string; requested_amount: number; status: string; created_at: string };

const money = (cents: number, currency: string) => `${currency} ${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

export default async function MembershipsPage() {
  const session = await requireSession();
  if (!session) redirect("/sign-in?redirect=/account/memberships");
  const [memberships, claims] = await withUserContext(session.user.id, (tx) => [
    tx`select * from public.my_memberships()`,
    tx`select * from public.my_benefit_claims()`,
  ]);
  const membershipRows = memberships as unknown as Membership[];
  const claimRows = claims as unknown as Claim[];

  return (
    <>
      <SiteHeader />
      <main className="page">
        <p className="kicker">Your account</p>
        <h1>My memberships</h1>
        {membershipRows.length === 0 && <p className="muted">You are not a member of any organization yet.</p>}
        {membershipRows.map((membership) => (
          <section key={membership.member_id} className="section" style={{ padding: "16px 0", borderBottom: "1px solid var(--line)" }}>
            <h2>{membership.org_name}</h2>
            <p className="muted">
              Member #{membership.member_number}{membership.membership_level ? ` · ${membership.membership_level}` : ""} · {membership.status}
            </p>
            {membership.paid_current ? (
              <p>Dues paid{membership.last_paid_at ? ` on ${new Date(membership.last_paid_at).toLocaleDateString()}` : ""}. Thank you.</p>
            ) : membership.dues_amount && membership.dues_amount > 0 ? (
              <DuesPayment
                memberId={membership.member_id}
                amount={membership.dues_amount}
                currency={membership.currency}
                label={money(membership.dues_amount, membership.currency)}
              />
            ) : (
              <p className="muted">Dues are not set up for your membership level yet. Contact the organization.</p>
            )}
          </section>
        ))}

        <section className="section" style={{ padding: "24px 0" }}>
          <h2>Benefit requests</h2>
          {claimRows.length === 0 && <p className="muted">You have not requested any benefits.</p>}
          <ul>
            {claimRows.map((claim) => (
              <li key={claim.claim_id}>
                {claim.program_name} with {claim.organization_name}: {money(claim.requested_amount, "USD")} · {claim.status.replace("_", " ")}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
