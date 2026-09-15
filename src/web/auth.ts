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
});
