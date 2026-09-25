import { Pool } from "@neondatabase/serverless";
import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import { sql } from "@/lib/database";

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
  // The Expo app has no cookie jar, so better-auth's expo() plugin issues a bearer token instead
  // and stores it in SecureStore; "benefitly://" is the app's deep-link scheme (apps/mobile/app.json).
  plugins: [expo()],
  trustedOrigins: [...(process.env.BETTER_AUTH_TRUSTED_ORIGINS || "http://localhost:3000").split(","), "benefitly://"],
  rateLimit: { enabled: true, storage: "database", customRules: { "/sign-in/email": { window: 60, max: 5 }, "/sign-up/email": { window: 60, max: 3 } } },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    disableCSRFCheck: false,
    disableOriginCheck: false,
    ipAddress: { ipAddressHeaders: ["x-forwarded-for", "x-real-ip"] },
    // Every domain table's owner_id/donor_id/actor_id/etc. is `uuid`. better-auth's default id
    // generator produces a 32-char alphanumeric string, not a UUID -- without this override,
    // every query binding session.user.id into a uuid column fails at the database with
    // "invalid input syntax for type uuid" the first time a real user signs up. The built-in
    // `generateId: "uuid"` shorthand relies on a `default gen_random_uuid()` on better-auth's own
    // `id` columns, which its own schema generator does not add -- verified against a real
    // Postgres database, it fails with a NOT NULL violation. A generator function sidesteps that.
    database: { generateId: () => crypto.randomUUID() },
  },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24, cookieCache: { enabled: true, maxAge: 300, strategy: "jwe" } },
  // better-auth owns its own `user` table; the domain schema's `public.profiles` (referenced by
  // campaigns.owner_id, donations.donor_id, every actor/reviewer id, etc.) is a separate table
  // that nothing else populates. Mirror it here so a freshly signed-up user can immediately own
  // a campaign, be added as an organization member, and so on.
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await sql`
            insert into public.profiles (id, email, name)
            values (${user.id}, ${user.email}, ${user.name})
            on conflict (id) do update set email = excluded.email, name = excluded.name, updated_at = now()
          `;
        },
      },
      update: {
        after: async (user) => {
          await sql`update public.profiles set email = ${user.email}, name = ${user.name}, updated_at = now() where id = ${user.id}`;
        },
      },
    },
  },
});
