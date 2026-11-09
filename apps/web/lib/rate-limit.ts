import { NextResponse } from "next/server";
import { sql } from "@/lib/database";

/**
 * The address to limit by. On Vercel, x-real-ip is set by the platform, so it is preferred over
 * x-forwarded-for, whose leftmost entry a client can forge.
 */
export function clientAddress(request: Request): string {
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",").pop()!.trim() : "unknown";
}

/** Returns a 429 response when the caller is over the limit for this bucket; otherwise null. */
export async function rateLimited(request: Request, bucket: string, maxHits: number, windowSeconds: number): Promise<NextResponse | null> {
  const key = `${bucket}:${clientAddress(request)}`;
  const [row] = await sql`select public.rate_limit_hit(${key}, ${maxHits}, ${windowSeconds}) as allowed`;
  if ((row as { allowed: boolean }).allowed) return null;
  return NextResponse.json(
    { error: { code: "RATE_LIMITED", message: "Too many requests. Please wait a few minutes and try again." } },
    { status: 429, headers: { "retry-after": String(windowSeconds) } },
  );
}
