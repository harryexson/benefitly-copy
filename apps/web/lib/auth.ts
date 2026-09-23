import { neon } from "@neondatabase/serverless";
import { betterAuth } from "better-auth";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl && process.env.NODE_ENV === "production") throw new Error("DATABASE_URL is required in production");

export const auth = betterAuth({
  appName: "Benefitly",
  database: neon(databaseUrl || "postgresql://invalid:invalid@localhost/benefitly"),
  emailAndPassword: { enabled: true },
  trustedOrigins: (process.env.BETTER_AUTH_TRUSTED_ORIGINS || "http://localhost:3000").split(","),
  rateLimit: { enabled: true, storage: "database", customRules: { "/sign-in/email": { window: 60, max: 5 }, "/sign-up/email": { window: 60, max: 3 } } },
  advanced: { useSecureCookies: process.env.NODE_ENV === "production", disableCSRFCheck: false, disableOriginCheck: false, ipAddress: { ipAddressHeaders: ["x-forwarded-for", "x-real-ip"] } },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24, cookieCache: { enabled: true, maxAge: 300, strategy: "jwe" } },
});
