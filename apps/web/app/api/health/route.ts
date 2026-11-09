import { NextResponse } from "next/server";
import { sql } from "@/lib/database";
import { logEvent } from "@/lib/observability";

export const dynamic = "force-dynamic";

/** Reports whether the database answers. Uptime monitors should alert on a 503 from this route. */
export async function GET() {
  const version = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";
  try {
    await sql`select 1`;
    return NextResponse.json({ status: "ok", service: "benefitly-web", database: "ok", version, time: new Date().toISOString() });
  } catch (error) {
    logEvent("error", "health_check_failed", { database: "unreachable", message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ status: "degraded", service: "benefitly-web", database: "unreachable", version, time: new Date().toISOString() }, { status: 503 });
  }
}
