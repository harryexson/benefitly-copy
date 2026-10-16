import { auth, isDatabaseConfigured } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const handlers = toNextJsHandler(auth);
const unavailable = () => NextResponse.json(
  { error: { code: "AUTH_NOT_CONFIGURED", message: "Authentication is unavailable until DATABASE_URL is configured." } },
  { status: 503 },
);

export async function GET(request: NextRequest) {
  return isDatabaseConfigured ? handlers.GET(request) : unavailable();
}

export async function POST(request: NextRequest) {
  return isDatabaseConfigured ? handlers.POST(request) : unavailable();
}
