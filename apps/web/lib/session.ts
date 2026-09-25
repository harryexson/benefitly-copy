import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function requireSession() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return null;
    return session;
  } catch {
    // No reachable database (placeholder DATABASE_URL) or a transient auth-store error: treat
    // as signed-out rather than crashing the page. Pages that require a session already render
    // a sign-in prompt for the null case.
    return null;
  }
}
