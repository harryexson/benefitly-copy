import { NextResponse } from "next/server";
import { planRefusalCode } from "@/lib/plan-errors";

const FORBIDDEN_MARKERS = ["not authorized", "cannot grant", "cannot create a role", "cannot assign", "not a member of this organization"];

/** Maps a database refusal to the response it deserves: plan gates and permissions are 403; everything else is the route's own code. */
export function orgErrorResponse(error: unknown, fallbackCode: string) {
  const message = error instanceof Error ? error.message : "Request failed";
  const refusal = planRefusalCode(message);
  if (refusal) return NextResponse.json({ error: { code: refusal, message } }, { status: 403 });
  if (FORBIDDEN_MARKERS.some((marker) => message.includes(marker))) return NextResponse.json({ error: { code: "FORBIDDEN", message } }, { status: 403 });
  return NextResponse.json({ error: { code: fallbackCode, message } }, { status: 400 });
}

/** Postgres array literal for uuid/text arrays whose elements were already validated by zod. */
export function pgArray(values: readonly string[]): string {
  return `{${values.map((value) => `"${value.replace(/"/g, '\\"')}"`).join(",")}}`;
}
