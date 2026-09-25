import Constants from "expo-constants";

/**
 * The Expo app and the web app call the same backend -- there is no separate mobile API.
 * Set EXPO_PUBLIC_API_URL (e.g. via eas.json build profiles or a .env file) to point at a real
 * deployment; it falls back to the Expo dev server's LAN host for local development against
 * `next dev`, and finally to localhost for the iOS simulator.
 */
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.hostUri ? `http://${Constants.expoConfig.hostUri.split(":")[0]}:3000` : "http://localhost:3000");
