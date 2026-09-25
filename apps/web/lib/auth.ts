import { Pool } from "@neondatabase/serverless";
import { betterAuth } from "better-auth";

const databaseUrl = process.env.DATABASE_URL;
// See lib/database.ts: this must not throw at module scope, or `next build` fails outright.

export const auth = betterAuth({
  appName: "Benefitly",
  // better-auth's Kysely Postgres dialect issues plain `sql(text, params)` calls, a calling
  // convention the neon() HTTP tagged-template function dropped in @neondatabase/serverless v1.
  // A node-postgres-compatible Pool is the supported bridge between the two.
  database: new Pool({ connectionString: databaseUrl || "postgresql://invalid:invalid@localhost/benefitly" }),
  // A missing secret is a hard BetterAuthError even at import time, which fails `next build`
  // itself (see lib/database.ts). The placeholder below is exactly as unusable for real auth as
  // the placeholder DATABASE_URL above -- BETTER_AUTH_SECRET is still required at deploy time.
  secret: process.env.BETTER_AUTH_SECRET || "insecure-build-placeholder-set-BETTER_AUTH_SECRET",
  emailAndPassword: { enabled: true },
  trustedOrigins: (process.env.BETTER_AUTH_TRUSTED_ORIGINS || "http://localhost:3000").split(","),
  rateLimit: { enabled: true, storage: "database", customRules: { "/sign-in/email": { window: 60, max: 5 }, "/sign-up/email": { window: 60, max: 3 } } },
  advanced: { useSecureCookies: process.env.NODE_ENV === "production", disableCSRFCheck: false, disableOriginCheck: false, ipAddress: { ipAddressHeaders: ["x-forwarded-for", "x-real-ip"] } },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24, cookieCache: { enabled: true, maxAge: 300, strategy: "jwe" } },
});
