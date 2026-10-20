import Constants from "expo-constants";

/**
 * The Expo app and the web app call the same backend -- there is no separate mobile API.
 * Set EXPO_PUBLIC_API_URL (e.g. via eas.json build profiles or a .env file) to override this,
 * which local development against `next dev` should do via the Expo dev server's LAN host.
 * The final fallback is the real deployed backend, not localhost: a build or export that forgets
 * to set EXPO_PUBLIC_API_URL must never silently point at a machine that doesn't exist for
 * whoever installs it, the way apps/web/lib/auth-client.ts's old "http://localhost:3000" default
 * did until that bug was found in production.
 */
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.hostUri ? `http://${Constants.expoConfig.hostUri.split(":")[0]}:3000` : "https://benefitly-web.vercel.app");
