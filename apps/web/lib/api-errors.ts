import { NextResponse } from "next/server";

/**
 * Wraps a route handler so an unreachable database (placeholder DATABASE_URL, a transient Neon
 * outage) or any other uncaught error returns a clean JSON 503/500 instead of Next's bare empty
 * 500 response. Route-specific errors (validation, authorization) should still be handled and
 * returned explicitly inside the handler; this is the last-resort catch-all.
 */
export function withRouteErrorHandling<Args extends unknown[]>(handler: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isConnectivity = /connect|ENOTFOUND|ECONNREFUSED|fetch failed|invalid/i.test(message);
      return NextResponse.json(
        { error: { code: isConnectivity ? "SERVICE_UNAVAILABLE" : "INTERNAL_ERROR", message: isConnectivity ? "This service is temporarily unavailable. Please try again shortly." : "Something went wrong." } },
        { status: isConnectivity ? 503 : 500 },
      );
    }
  };
}
