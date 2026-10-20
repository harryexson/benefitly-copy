import { neon } from "@neondatabase/serverless";
import type { NeonQueryFunctionInTransaction, NeonQueryInTransaction } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
// Deliberately does not throw at module scope: `next build` sets NODE_ENV=production and
// imports every route to collect page data, so a missing-credential throw here would fail the
// build itself rather than the request. Every real query against this placeholder host fails
// loudly at call time instead, which is the correct place to surface a missing DATABASE_URL.
export const sql = neon(url || "postgresql://invalid:invalid@localhost/benefitly");

/**
 * Runs `operation` inside a single Postgres transaction with `app.user_id` bound to the
 * verified session user. Every RLS policy in database/migrations reads this setting via
 * `public.current_user_id()`, so no query outside this helper may see tenant-scoped rows.
 *
 * Neon's HTTP driver has no persistent connection, so binding must happen inside the same
 * non-interactive `sql.transaction(...)` call as the guarded query -- a separate `SET` call
 * would land on a different connection and have no effect. The first entry in the returned
 * array is always the `set_config` bookkeeping row and is stripped before returning.
 */
export async function withUserContext(
  userId: string,
  operation: (tx: NeonQueryFunctionInTransaction<false, false>) => NeonQueryInTransaction[],
): Promise<Record<string, unknown>[][]> {
  if (!userId) throw new Error("Authenticated user is required");
  const results = await sql.transaction((tx) => [tx`select set_config('app.user_id', ${userId}, true)`, ...operation(tx)]);
  return results.slice(1);
}
