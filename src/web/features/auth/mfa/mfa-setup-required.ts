import "server-only";

// ALWAYS_ALLOWED_PREFIXES: the forced setup page itself and every API
// route it depends on (its own session check, the enrol/confirm/
// settings endpoints) must remain reachable, or a user with no
// user_security row could never actually complete setup - an
// infinite redirect loop. Also excludes /api/auth/* wholesale
// (Better Auth's own router - sign-out must always work, even
// mid-setup) and /log-in, /sign-up, /forget-password,
// /reset-password (a user without a session yet must still be able
// to reach these).
export const ALWAYS_ALLOWED_PREFIXES = [
  "/mfa-setup",
  "/api/auth",
  "/api/user/security/settings",
  "/log-in",
  "/sign-up",
  "/forget-password",
  "/reset-password",
  "/legal",
];

export function isAlwaysAllowedPath(pathname: string): boolean {
  return ALWAYS_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

// A user_security row existing is NOT the same as setup being
// genuinely complete: /api/auth/two-factor/enrol upserts this row
// (twoFactorSecret set, requiredFactors including "totp") the moment
// enrolment STARTS, before the user has scanned anything or proven
// their authenticator app produces a matching code -
// twoFactorEnabled only flips to true once
// /api/auth/two-factor/confirm succeeds (see that route's own
// comment on why: an unconfirmed secret must never be depended on).
// Treating row-existence alone as complete would defeat this gate
// for anyone who starts enrolling but abandons it before confirming.
// Email OTP and password-only, by contrast, are only ever saved via
// a deliberate /api/user/security/settings POST, which never
// touches twoFactorSecret/twoFactorEnabled - so for those,
// requiredFactors reflecting a real saved choice IS completion, with
// no separate confirmation step to wait for.
export function isMfaSetupComplete(
  security: { requiredFactors: string[]; twoFactorEnabled: boolean } | undefined,
): boolean {
  return (
    !!security &&
    (!security.requiredFactors.includes("totp") || security.twoFactorEnabled)
  );
}
