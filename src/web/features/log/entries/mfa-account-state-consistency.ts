import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "mfa-account-state-consistency",
  date: "2026-09-20",
  title:
    "Four real MFA lockout/UX bugs fixed together: unconfirmed-TOTP lockout, lost verification email, split trust-device logic, stale Account page state",
  summary:
    "One ticket covering four related reports, all traced to the same root cause: user_security state being written and read inconsistently across the enrol/challenge/settings/account-display code paths. (1) Real, reported account lockout: /api/user/security/settings let a user save 'totp' as a required sign-in factor without ever actually confirming a real code - login-step1 then demanded a factor with no working secret behind it at all, an unrecoverable lockout with no error shown at save time. Root cause confirmed live: reproduced the exact reported sequence (enrol Email OTP, log out/in, then select Authenticator App on the Account page without ever scanning/confirming it) against real Postgres, confirmed the save previously succeeded silently, then confirmed the fix blocks it both client- and server-side while leaving the account fully usable. (2) Sign-up's 'check your inbox' screen and log-in's verification-required error had no way to request a fresh link if the original was lost - Better Auth's own duplicate-signup path never resent anything either. (3) Two disconnected 'trust this device' write paths existed: the MFA-challenge checkbox created a real trusted_devices row but never set the column login-step1 actually checks, so the device was silently re-challenged every time regardless. (4) The Account page always rendered the settings dashboard with hardcoded defaults instead of the account's real saved choices, making every visit look unconfigured. A fifth reported symptom (an old/stale TOTP code from a second authenticator-app install being silently accepted) was investigated with two separate live repros against real Postgres and could NOT be reproduced as described - left open, tracked honestly as unconfirmed rather than guessed at.",
  tags: ["auth", "bug", "mfa", "testing"],
  decisions: [
    "The unconfirmed-TOTP lockout is closed in two layers, not one: /api/user/security/settings rejects any save where requiredFactors includes 'totp' unless the account's existing row already has twoFactorEnabled true (server-side, authoritative), and MfaSettingsDashboard independently disables its own Save button the moment TOTP is selected but not yet confirmed in the current session (client-side, immediate feedback) - TotpEnrolment now exposes onConfirmed/onEnrolmentStarted callbacks specifically so the dashboard's local state never drifts from what a real confirm actually did.",
    "Chose Better Auth's own onExistingUserSignUp hook plus its existing /send-verification-email endpoint over a bespoke resend route - the installed endpoint already has its own constant-time anti-enumeration floor (confirmed directly against the installed package source) so a real send, an already-verified account, and a nonexistent account are all indistinguishable by response timing; re-implementing that guard in project code would only add a weaker, redundant check.",
    "The trust-device fix adds the missing setMfaFrequency('30_days') call to the MFA-challenge route rather than removing either mechanism - checking the box at challenge time and picking the radio in Account settings are kept as two legitimate entry points to the same one underlying column, since both are equally valid explicit statements of the same intent.",
    "Investigated but explicitly left open: the reported 'old/stale TOTP code silently accepted, then not challenged on next login' scenario. Two direct live repros against real Postgres (confirm with the genuinely correct code; confirm with a code generated from a superseded 'Start over' secret) both behaved correctly - the stale code was rejected and re-login correctly demanded the challenge either way. Rather than fabricate a fix for a bug that could not be confirmed to exist as described, this was reported back and deliberately deferred pending a clearer repro.",
  ],
  milestones: [
    "src/web/app/api/user/security/settings/route.ts: rejects newly requiring 'totp' unless the account already has a confirmed factor.",
    "src/web/components/account/{mfa-settings-dashboard,totp-enrolment}.tsx: client-side confirmation-state gate plus the onConfirmed/onEnrolmentStarted callback wiring.",
    "src/web/app/account/page.tsx and src/web/app/mfa-setup/page.tsx: now fetch and pass the account's real saved requiredFactors/mfaFrequency/twoFactorEnabled into the dashboard instead of relying on hardcoded defaults.",
    "src/web/app/api/auth/two-factor/verify/route.ts: sets mfa_frequency to '30_days' when the challenge-time trust-device checkbox is checked.",
    "src/web/auth.ts: onExistingUserSignUp resends a fresh verification email on re-signup with an existing unverified address.",
    "src/web/components/auth/resend-verification-email-button.tsx (new): explicit resend control wired into both the sign-up 'check your inbox' screen and log-in's verification-required error state.",
    "Regression coverage added across all four fixes: unit tests (security-settings route, mfa-settings-dashboard, totp-enrolment, two-factor/verify route, resend-verification-email-button) and real-Postgres e2e specs (tests-e2e/mfa-flow.spec.ts, tests-e2e/sign-up.spec.ts).",
  ],
  validation: [
    "npx tsc --noEmit and npx eslint --max-warnings 0 both pass clean.",
    "npm run test:unit: 288 passed, 0 failed, across 44 files.",
    "Live-reproduced the unconfirmed-TOTP lockout, the trust-device fix, and the account-page real-state fix together in one headed Playwright run against real local Postgres: saving Authenticator App without ever confirming a code is blocked (Save button stays disabled, the server independently rejects a forced request), the account is never locked out afterwards, and re-visiting the Account page correctly shows the real saved Email OTP + trusted-device state rather than defaults.",
    "Live-reproduced the resend-verification-email fix: re-signing up with an existing unverified email, and clicking the explicit resend button, both produce a genuinely new, followable verification link.",
    "Husky pre-commit hook (gitleaks + lint + typecheck) passed on this commit.",
  ],
  visibility: "public",
};
