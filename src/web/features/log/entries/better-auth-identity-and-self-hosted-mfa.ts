import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "better-auth-identity-and-self-hosted-mfa",
  date: "2026-09-15",
  title: "Identity foundation: Better Auth + self-hosted, encrypted TOTP MFA",
  summary:
    "Built the identity layer's foundation - Better Auth for session/credential/OAuth core, its CLI-generated Drizzle schema against Postgres 16, citext for case-insensitive email, and a self-built TOTP MFA module with application-layer envelope encryption - after a live discussion surfaced that Auth.js has merged into Better Auth and that Better Auth's own twoFactor plugin stores its TOTP secret as plain text with no read-side decrypt hook. No registration/login UI or the role-gated visibility feature this was originally motivated by are built yet - this slice is the identity foundation only.",
  tags: ["architecture", "database", "security", "typescript"],
  decisions: [
    "Chose Better Auth over Auth.js (NextAuth) - Auth.js's own homepage now states 'The Auth.js project is now part of Better Auth,' the same authors/company, not an unrelated fork. Starting fresh on Auth.js today would mean planning a near-immediate migration.",
    "Reused the existing pg/node-postgres driver rather than adding postgres-js - @better-auth/drizzle-adapter explicitly supports provider: \"pg\", confirmed against its own docs, so no second Postgres driver was needed.",
    "Generated Better Auth's core user/session/account/verification schema for real via its own CLI (npx auth@latest generate --adapter drizzle --dialect postgresql) against this project's actual db/client.ts, rather than transcribing documentation examples - caught along the way that @better-auth/cli (the package) is itself deprecated on npm; the correct current package is auth.",
    "Rejected Better Auth's built-in twoFactor plugin for MFA after verifying its schema docs state it stores twoFactorBackupCodes encrypted but the primary twoFactorSecret as plain text, and confirming databaseHooks only documents create/update 'before' hooks with no symmetric read-side decrypt hook the plugin's own internal verification endpoint would invoke. Built MFA entirely ourselves instead: an application-layer AES-256-GCM envelope-encrypted two_factor_secret column (key from Key Vault via app_settings, same pattern as DATABASE_URL's password) and a self-written TOTP verification route using otpauth (RFC 4226/6238-compliant, actively maintained, zero native dependencies).",
    "Added citext as a Drizzle customType (no native Drizzle column helper exists for it) for the user.email column - confirmed present on Azure's own extension allowlist for Postgres 16, but still requires an explicit azurerm_postgresql_flexible_server_configuration Terraform resource setting azure.extensions; it is not enabled just because the base extension exists upstream.",
    "Confirmed the Better Auth CLI generator has the exact same plain-Node-outside-the-bundler constraint drizzle-kit does - db/schema.ts's server-only guard was already removed in the prior slice for this reason.",
    "Wrote docs/adr/0012-better-auth-identity-and-self-hosted-mfa.md documenting all of the above, including the third-party-identity-SaaS (Okta/Auth0/Clerk/Entra External ID) rejection already settled in a prior discussion for UK GDPR data-sovereignty reasons.",
  ],
  milestones: [
    "Installed better-auth, @better-auth/drizzle-adapter, and otpauth; ran npm audit and confirmed zero new vulnerabilities beyond the already-accepted drizzle-kit/esbuild advisory.",
    "Added Better Auth's user/session/account/verification tables and a self-built user_security table (two_factor_secret, two_factor_enabled, cascade-deleted with user) to db/schema.ts.",
    "Removed log_entries (ADR-0011) from db/schema.ts, along with DrizzleLogEntryRepository, its test, and log-entries.zod.ts/zod-openapi-setup.ts/scripts/generate-openapi.ts - this slice's migration would otherwise have chained on top of an already-deferred, no-consumer table. Recoverable from git history as one unit once the role-gated visibility feature that actually needs log_entries is built. The public /log pages are unaffected (they read the static entries/*.ts files directly, never through Drizzle).",
    "Added the permanent auth.ts server config and app/api/auth/[...all]/route.ts mounting Better Auth's handlers, plus a custom app/api/auth/two-factor/verify/route.ts implementing our own TOTP verification with Zod perimeter validation.",
    "Added features/auth/mfa/ (two-factor-secret-cipher.ts, user-security-repository.ts + drizzle-user-security-repository.ts, verify-totp.zod.ts), mirroring features/log/'s repository-pattern conventions exactly.",
    "Generated drizzle/0000_better_auth_identity_and_mfa.sql via drizzle-kit generate and applied it against a real, fresh postgres:16 Docker container (the workflow proven and documented in the prior slice) - verified every table's shape and the ON DELETE CASCADE constraints via psql \\d, and proved citext case-insensitive lookup works (inserted 'Foo@Example.com', found it via WHERE email = 'foo@example.com').",
    "Added azurerm_postgresql_flexible_server_configuration (azure.extensions = CITEXT) to the postgresql module, and MFA_ENCRYPTION_KEY/BETTER_AUTH_SECRET/BETTER_AUTH_URL Key-Vault-sourced app_settings to the dev environment's web app.",
    "Added Vitest suites for the encryption module (round-trip, random-IV non-determinism, tamper detection via a flipped ciphertext byte, missing/malformed key handling) and for the actual otpauth generate/validate behaviour (correct code accepted, wrong code and wrong secret rejected, base32 round-trip) - all passing against the real otpauth library, not a mock.",
  ],
  validation: [
    "terraform fmt -check and terraform validate both passed for infrastructure/app",
    "npm run typecheck and npm run lint (eslint --max-warnings 0) both passed clean",
    "npm run build succeeded - both new auth routes correctly reported as Dynamic; every previously-static/SSG route unaffected",
    "npm run test:unit: 24 passed, 0 failed (the previously-skipped PGlite log_entries suite was removed along with log_entries itself, per the milestone above, not left silently skipped)",
    "npm run db:migrate applied cleanly against a real, freshly started postgres:16 Docker container with citext enabled; every generated table's columns, defaults, and ON DELETE CASCADE foreign keys verified directly via psql, not assumed from the migration file alone",
    "npm audit: 0 new vulnerabilities beyond the already-documented, accepted drizzle-kit/esbuild advisory",
  ],
  visibility: "public",
};
