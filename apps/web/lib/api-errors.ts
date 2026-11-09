import { NextResponse } from "next/server";
import { reportError } from "@/lib/observability";

/**
 * Wraps a route handler so an unreachable database (placeholder DATABASE_URL, a transient Neon
 * outage) or any other uncaught error returns a clean JSON 503/500 instead of Next's bare empty
 * 500 response, and is reported to the error log. Route-specific errors (validation, authorization)
 * are still handled and returned explicitly inside the handler; this is the last-resort catch-all.
 */
export function withRouteErrorHandling<Args extends unknown[]>(handler: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      const request = args[0] instanceof Request ? args[0] : undefined;
      const message = error instanceof Error ? error.message : String(error);
      const isConnectivity = /connect|ENOTFOUND|ECONNREFUSED|fetch failed|invalid/i.test(message);
      await reportError(error, {
        route: request ? new URL(request.url).pathname : undefined,
        method: request?.method,
        status: isConnectivity ? 503 : 500,
      });
      return NextResponse.json(
        { error: { code: isConnectivity ? "SERVICE_UNAVAILABLE" : "INTERNAL_ERROR", message: isConnectivity ? "This service is temporarily unavailable. Please try again shortly." : "Something went wrong." } },
        { status: isConnectivity ? 503 : 500 },
      );
    }
  };
}
