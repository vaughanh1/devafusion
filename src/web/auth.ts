import "server-only";

import { APIError, createAuthMiddleware } from "better-auth/api";
import { betterAuth } from "better-auth";
import { captcha } from "better-auth/plugins";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";

import { db } from "@/db/client";
import { verifyFormTimingToken } from "@/features/auth/form-timing-token";
import { deleteMfaDataForUser } from "@/features/auth/mfa/mfa-deletion-handler";
import { TRUSTED_DEVICE_COOKIE_NAME } from "@/features/auth/mfa/trusted-device-cookie";
import { isPasswordStrongEnough } from "@/features/auth/password-strength";

// Paths carrying a client-rendered form protected by the stateless
// timing heuristic (docs/adr/0014, features/auth/form-timing-token.ts)
// - the same three endpoints Turnstile's captcha plugin defaults to,
// since both are defending the same human-facing forms.
const TIMING_PROTECTED_PATHS = new Set([
  "/sign-up/email",
  "/sign-in/email",
  "/request-password-reset",
]);

// Paths that set a password, each under a different body field name -
// features/auth/password-strength.ts is the single source of truth
// for the complexity rule, enforced here as well as client-side
// (sign-up-form.tsx, reset-password-form.tsx) since a client-only
// check is trivially bypassed by calling either endpoint directly.
// Better Auth's own emailAndPassword config exposes no complexity
// option, only minPasswordLength/maxPasswordLength (verified directly
// against @better-auth/core's init-options type).
const PASSWORD_FIELD_BY_PATH: Record<string, string> = {
  "/sign-up/email": "password",
  "/reset-password": "newPassword",
};

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
    // UK GDPR Article 15/17 "right to be forgotten" self-service flows
    // (account export/deletion) are already built; a password-reset
    // flow is this slice's own addition (docs/adr/0014). There is no
    // email-sending infrastructure in this project yet (same gap noted
    // on user.deleteUser below) - this callback logs loudly rather than
    // silently pretending to send an email, so the gap stays visible
    // until a real provider (Azure Communication Services Email or a
    // transactional API) is deliberately chosen as its own decision.
    sendResetPassword: async ({ user, url }) => {
      console.warn(
        `[auth] sendResetPassword called for user ${user.id} but no email provider is configured yet - reset URL was NOT delivered: ${url}`,
      );
    },
  },
  // ADR-0014: rate limiting is enabled in every environment (Better
  // Auth defaults to disabled outside production) since this app has
  // no WAF/Front Door in front of it - the app itself is the only
  // layer that can throttle abusive traffic. Storage is the Drizzle-
  // backed Postgres table (see db/schema.ts's rateLimit table,
  // generated via `npx auth@latest generate`) rather than in-memory,
  // since this single-instance app can still restart/redeploy and an
  // in-memory counter would silently reset on every deploy.
  rateLimit: {
    enabled: true,
    storage: "database",
  },
  advanced: {
    // ADR-0014: Azure App Service's public multitenant front-end has
    // no small, stable, documented set of front-end IPs to list as
    // `trustedProxies` (unlike a self-run reverse proxy) - Microsoft
    // publishes only the large, dynamic AzureCloud service tag, which
    // is not usable as a CIDR allowlist here. Leaving trustedProxies
    // unset relies on Better Auth's own safe-by-default behaviour
    // (@better-auth/core/utils/ip.ts, read directly): a single-value
    // X-Forwarded-For (this app's real topology - client -> Azure
    // front-end -> app, one hop) is trusted; a multi-value chain
    // (e.g. a bot appending a second fabricated hop) is deliberately
    // rejected rather than guessed at, falling through to a shared
    // "no trusted IP" bucket instead of ever being misattributed.
    // This does NOT stop a bot sending a single spoofed value (there
    // is no way to distinguish that from a genuine single-hop client
    // using this header alone) - that gap is deliberately covered by
    // the Turnstile captcha plugin (network-level signal, not header-
    // derived) and the stateless timing heuristic below, not by IP
    // configuration. See docs/adr/0014 Consequences.
    ipAddress: {
      ipAddressHeaders: ["x-forwarded-for"],
    },
  },
  // ADR-0014: bot/automation protection. Cloudflare Turnstile in
  // Managed mode - not Invisible mode, which would additionally
  // require referencing Cloudflare's Turnstile Privacy Addendum in
  // this project's own privacy policy for no accuracy benefit, since
  // Managed mode already runs the same background JS-challenge/proof-
  // of-work/browser-attestation checks and only escalates to a visible
  // checkbox when those signals are ambiguous. Default endpoints
  // (/sign-up/email, /sign-in/email, /request-password-reset) are used
  // unchanged - see docs/gdpr/0001 for the Article 6(1)(f) legitimate-
  // interests basis this processing relies on.
  plugins: [
    captcha({
      provider: "cloudflare-turnstile",
      secretKey: process.env.TURNSTILE_SECRET_KEY!,
    }),
  ],
  // ADR-0014: stateless timing heuristic, independent of Turnstile.
  // Rejects a request whose signed render timestamp (see
  // features/auth/form-timing-token.ts) is missing, tampered with,
  // submitted implausibly fast, or stale - before Better Auth's own
  // endpoint handler (and therefore the captcha/rate-limit checks
  // that already ran) does any real work. A missing token is treated
  // as a hard failure, not a silent pass-through, so a form that
  // forgets to include the hidden field is a build-time-visible bug,
  // not a silently-disabled check.
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      // UK GDPR Article 17: a deleted account's browser must never
      // continue presenting the trusted-device bypass cookie -
      // expiring it here (an httpOnly cookie, unreachable from
      // client-side JS) rather than relying on the client to clear
      // it itself, since the deletion flow's own success response
      // has no reason to also carry application code that clears
      // application cookies unless this hook does it centrally.
      if (ctx.path === "/delete-user") {
        ctx.setCookie(TRUSTED_DEVICE_COOKIE_NAME, "", { maxAge: 0 });
      }
    }),
    before: createAuthMiddleware(async (ctx) => {
      const passwordField = PASSWORD_FIELD_BY_PATH[ctx.path];
      if (passwordField) {
        const password = (ctx.body as Record<string, unknown> | undefined)?.[
          passwordField
        ];
        if (typeof password !== "string" || !isPasswordStrongEnough(password)) {
          throw new APIError("BAD_REQUEST", {
            message:
              "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.",
            code: "PASSWORD_TOO_WEAK",
          });
        }
      }

      if (!TIMING_PROTECTED_PATHS.has(ctx.path)) return;

      const result = verifyFormTimingToken(
        (ctx.body as Record<string, unknown> | undefined)?.formTimingToken,
      );
      if (!result.valid) {
        throw new APIError("BAD_REQUEST", {
          message: "Request could not be verified. Please reload the page and try again.",
          code: "FORM_TIMING_CHECK_FAILED",
        });
      }
    }),
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
      // UK GDPR Article 17/32: explicit transactional cleanup of this
      // project's own MFA matrix tables (user_security, backup_codes,
      // trusted_devices) plus an accompanying auth_audit_logs entry -
      // db/schema.ts's own ON DELETE CASCADE foreign keys already
      // guarantee this via user.id's cascade, but beforeDelete runs
      // first specifically so the audit trail is written while the
      // rows it describes still exist, and so this stays a single,
      // explicit, reasoned-about operation rather than an implicit
      // side effect of the FK cascade alone (see
      // features/auth/mfa/mfa-deletion-handler.ts's own comment).
      beforeDelete: async (user) => {
        await deleteMfaDataForUser(user.id, user.id);
      },
    },
  },
});
