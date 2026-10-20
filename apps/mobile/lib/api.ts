import { API_URL } from "./config";
import { authClient } from "./auth-client";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Calls the same Next.js API routes the web app uses (apps/web/app/api/**) -- there is no
 * separate mobile backend. better-auth's Expo client stores the session as a cookie in
 * SecureStore rather than exposing a bearer token, so every authenticated call replays it here.
 */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const cookie = await authClient.getCookie();
  // FormData bodies (media upload) must not get a manual Content-Type: fetch needs to set its
  // own multipart boundary, which a fixed header would override and break parsing server-side.
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(cookie ? { Cookie: cookie } : {}),
      ...init.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(response.status, body?.error?.code ?? "UNKNOWN", body?.error?.message ?? "Something went wrong.");
  }
  return body.data as T;
}
