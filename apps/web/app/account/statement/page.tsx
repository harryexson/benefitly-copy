import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { PrintButton } from "@/components/print-button";
import { myGivingStatement, myGivingYears } from "@/lib/donor";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Giving statement" };

export default async function GivingStatementPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const session = await requireSession();
  if (!session) {
    return (
      <>
        <SiteHeader />
        <main className="page">
          <h1>Sign in required</h1>
          <p>
            <Link href="/sign-in">Sign in</Link> to view your giving statement.
          </p>
        </main>
      </>
    );
  }

  const { year: yearParam } = await searchParams;
  const selectedYear = yearParam === "all" ? null : yearParam ? Number(yearParam) : new Date().getFullYear();

  let years: number[] = [];
  let rows: Awaited<ReturnType<typeof myGivingStatement>> = [];
  let unavailable = false;
  try {
    [years, rows] = await Promise.all([myGivingYears(session.user.id), myGivingStatement(session.user.id, selectedYear)]);
  } catch {
    unavailable = true;
  }

  const total = rows.reduce((sum, r) => sum + r.gross_amount, 0);
  const byOrganizer = new Map<string, number>();
  for (const row of rows) byOrganizer.set(row.organizer, (byOrganizer.get(row.organizer) ?? 0) + row.gross_amount);

  return (
    <>
      <div className="no-print">
        <SiteHeader />
      </div>
      <main className="page statement-page">
        <div className="no-print" style={{ marginBottom: 24 }}>
          <p className="kicker">Your giving account</p>
          <h1>Giving statement</h1>
          <div className="filter-row" aria-label="Statement period">
            {years.map((y) => (
              <Link key={y} href={`/account/statement?year=${y}`} className={selectedYear === y ? "active" : undefined}>
                {y}
              </Link>
            ))}
            <Link href="/account/statement?year=all" className={selectedYear === null ? "active" : undefined}>
              All time
            </Link>
          </div>
          {rows.length > 0 && <PrintButton />}
        </div>

        {unavailable && <p className="muted">Your statement can&apos;t be loaded right now. Please try again shortly.</p>}

        {!unavailable && (
          <>
            <header className="statement-header">
              <h2>Benefitly giving statement</h2>
              <p>{selectedYear ? `Tax year ${selectedYear}` : "All-time record"}</p>
              <p>Prepared for {session.user.name || session.user.email}</p>
              <p className="muted">Generated {new Date().toLocaleDateString()}</p>
            </header>

            {rows.length === 0 && <p className="muted">No succeeded donations found for this period.</p>}

            {rows.length > 0 && (
              <>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Recipient organization</th>
                      <th>Fundraiser</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.donation_id}>
                        <td>{new Date(row.donated_at).toLocaleDateString()}</td>
                        <td>{row.organizer}</td>
                        <td>{row.campaign_title}</td>
                        <td>
                          ${(row.gross_amount / 100).toLocaleString()} {row.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <section style={{ marginTop: 24 }}>
                  <h3>Summary by organization</h3>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Organization</th>
                        <th>Total given</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from(byOrganizer.entries()).map(([organizer, cents]) => (
                        <tr key={organizer}>
                          <td>{organizer}</td>
                          <td>${(cents / 100).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>

                <p className="statement-total">
                  Total given{selectedYear ? ` in ${selectedYear}` : ""}: <strong>${(total / 100).toLocaleString()}</strong>
                </p>
                <p className="muted" style={{ marginTop: 24 }}>
                  This statement reflects donations processed through Benefitly only. Consult a tax professional regarding
                  charitable-deduction eligibility; Benefitly does not provide tax advice.
                </p>
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}
