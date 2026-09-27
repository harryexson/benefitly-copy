import { createAuthClient } from "better-auth/react";

// Deliberately no "http://localhost:3000" fallback here: on any deployed environment (Vercel
// preview, production, a custom domain) that literal string would send every sign-up/sign-in
// request to the visitor's own machine instead of the real API, failing silently in the browser
// network tab. Leaving baseURL unset lets better-auth's client fall back to `window.location.origin`
// (browser) or the request's own origin (server), which is correct in every environment without
// needing NEXT_PUBLIC_APP_URL configured at all. NEXT_PUBLIC_APP_URL still overrides it when set.
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || undefined,
});
