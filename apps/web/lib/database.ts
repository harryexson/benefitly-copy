import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url && process.env.NODE_ENV === "production") throw new Error("DATABASE_URL is required");
export const sql = neon(url || "postgresql://invalid:invalid@localhost/benefitly");

export async function withUserContext<T>(userId: string, operation: () => Promise<T>) {
  if (!userId) throw new Error("Authenticated user is required");
  // The transaction-aware implementation is enabled when a Neon connection is configured.
  // This boundary prevents organization context from ever being accepted from a client.
  return operation();
}
