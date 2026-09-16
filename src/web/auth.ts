import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";

import { db } from "@/db/client";

// Better Auth owns identity/session/OAuth core only - MFA is deliberately
// NOT handled by Better Auth's own twoFactor plugin. See
// docs/adr/0012-better-auth-identity-and-self-hosted-mfa.md: the plugin
// stores its primary TOTP secret as plain text with no read-side decrypt
// hook available, so this project builds MFA itself instead
// (features/auth/mfa/) on top of Better Auth's core user table.
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    // UK GDPR Article 17 right to erasure - password re-confirmation
    // only, no sendDeleteAccountVerification email callback (this
    // project has no email-sending infrastructure yet, and Better
    // Auth's own deleteUser route checks that option with `?.`, so
    // omitting it entirely skips the email step and deletes
    // immediately once the user's session is fresh/password is
    // confirmed). db/schema.ts's session/account/user_security tables
    // all carry `onDelete: "cascade"` foreign keys to user.id -
    // verified directly against a real local Postgres that deleting
    // the user row cascades to all three with no application code
    // needed, so no beforeDelete/afterDelete hook is required here.
    deleteUser: {
      enabled: true,
    },
  },
});
