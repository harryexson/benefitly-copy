import { getAuth, isDatabaseConfigured } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const unavailable = () => NextResponse.json(
  { error: { code: "AUTH_NOT_CONFIGURED", message: "Authentication is unavailable until DATABASE_URL is configured." } },
  { status: 503 },
);

export async function GET(request: NextRequest) {
  if (!isDatabaseConfigured) return unavailable();
  return toNextJsHandler(getAuth()).GET(request);
}

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured) return unavailable();
  return toNextJsHandler(getAuth()).POST(request);
}
