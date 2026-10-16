import { neon } from "@neondatabase/serverless";
import { betterAuth } from "better-auth";

const databaseUrl = process.env.DATABASE_URL;
/** Public pages can render without Neon; auth routes reject requests until it is configured. */
export const isDatabaseConfigured = Boolean(databaseUrl);

export function getAuth() {
  if (!databaseUrl) throw new Error("DATABASE_URL is required for authentication");

  return betterAuth({
    appName: "Benefitly",
    database: neon(databaseUrl),
    emailAndPassword: { enabled: true },
    trustedOrigins: (process.env.BETTER_AUTH_TRUSTED_ORIGINS || "http://localhost:3000").split(","),
    rateLimit: { enabled: true, storage: "database", customRules: { "/sign-in/email": { window: 60, max: 5 }, "/sign-up/email": { window: 60, max: 3 } } },
    advanced: { useSecureCookies: process.env.NODE_ENV === "production", disableCSRFCheck: false, disableOriginCheck: false, ipAddress: { ipAddressHeaders: ["x-forwarded-for", "x-real-ip"] } },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24, cookieCache: { enabled: true, maxAge: 300, strategy: "jwe" } },
  });
}
