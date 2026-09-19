import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "mandatory-mfa-setup-and-app-service-logging",
  date: "2026-09-19",
  title: "Forced MFA setup on first login, real otpauth:// deep link, and App Service logging enabled",
  summary:
    "Closed a real lockout: a fresh account with no user_security row was silently defaulted to require TOTP at login, but had no forced enrolment step first - first login prompted for an authenticator code the user had never set up, a genuine dead end with no way out. Fixed with real, request-level enforcement (proxy.ts) achieving the same parity requireEmailVerification already has for email: an authenticated account whose second-factor choice is not genuinely complete is redirected to a new mandatory /mfa-setup page on every route, not shown a dashboard banner it could navigate past. Also added a tappable otpauth:// deep link for enrolling on a phone with no second camera-equipped device to scan with, a 'start over' control for a botched QR scan, and enabled App Service filesystem logging so a future 500 (like the MFA_ENCRYPTION_KEY-length incident this session) is diagnosable without a manual local reproduction.",
  tags: ["security", "gdpr", "azure", "typescript"],
  decisions: [
    "middleware.ts's file convention is deprecated in the installed Next.js 16.3.5 (confirmed by actually running a real build and reading its own emitted warning) in favour of proxy.ts/export function proxy - used the current convention for new code rather than knowingly introducing a deprecated one, per root AGENTS.md's Deprecation Upgrades rule. Confirmed empirically (not just from docs) that proxy.ts defaults to the Node.js runtime and can use a real pg-backed repository call directly - no Edge-runtime workaround needed.",
    "Row EXISTENCE in user_security is not the same as setup being genuinely complete - a real gap found while testing: /api/auth/two-factor/enrol upserts a row (twoFactorSecret set, requiredFactors including totp) the moment enrolment STARTS, before any code is confirmed. A naive 'does a row exist' check in the proxy would have let a user through mid-enrolment, before their authenticator app was ever proven to work - reproduced this exact gap with a real Playwright script against local Postgres before writing the fix, then wrote isMfaSetupComplete to require twoFactorEnabled specifically when totp is a required factor (Email OTP/password-only have no separate confirmation step, so a saved row IS completion for those).",
    "Extracted the path-allowlist and completion-check logic into a separate, plain module (features/auth/mfa/mfa-setup-required.ts) specifically so it has direct unit test coverage (mfa-setup-required.test.ts) rather than only being provable via a slower, real-Postgres e2e spec - proxy.ts itself stays thin Next.js wiring.",
    "The otpauth:// deep link's OS-level handler registration was not verified per-authenticator-app (varies by app/OS, outside what this server can check) - only the URI scheme itself is confirmed against Google Authenticator's own published Key Uri Format spec. Rendered as a plain <a>, not a script-triggered redirect, so it degrades harmlessly on a device where nothing claims the scheme.",
    "App Service application_logs file_system_level set to its most permissive value (Verbose), not a narrower Warning/Error - confirmed this is a plain Node process writing to stdout/stderr, not a .NET app with ILogger-style severity tracing, so the level does not filter by this app's own console.error/console.log call sites the way it would for .NET; a narrower setting would risk silently dropping exactly the output this change exists to capture. retention_in_mb bounds local disk cost instead.",
    "Reproduced every claimed behaviour against a real local Postgres, not just reasoned about the code: the mid-enrolment redirect gap, the Email-OTP-unlocks-immediately path, and the full enrol-confirm-login cycle were each proven with real fetch/Playwright scripts before being written up as fixed.",
  ],
  milestones: [
    "src/web/proxy.ts (new): Node.js-runtime request-level enforcement, redirecting to /mfa-setup unless isAlwaysAllowedPath or isMfaSetupComplete.",
    "src/web/features/auth/mfa/mfa-setup-required.ts (new) + __tests__/mfa-setup-required.test.ts: extracted, directly unit-tested path/completion logic.",
    "src/web/app/mfa-setup/page.tsx (new): the forced setup page, reusing MfaSettingsDashboard, with its own server-side redirect for the two cases proxy.ts's allowlist can't cover (unauthenticated, or already-complete).",
    "src/web/app/api/auth/two-factor/enrol/route.ts: response now includes the raw otpauthUri alongside the rendered QR PNG.",
    "src/web/components/account/totp-enrolment.tsx: added the otpauth:// deep link and a 'start over with a new QR code' control at the scanning stage.",
    "src/web/tests-e2e/mfa-setup-required.spec.ts (new): real end-to-end proof of the mid-enrolment redirect gap being closed, the deep link/start-over controls existing, and both the TOTP-confirmed and Email-OTP-saved paths correctly unlocking access.",
    "infrastructure/app/modules/webapp/main.tf: added a logs block (application_logs.file_system_level = Verbose, http_logs.file_system with bounded retention) to azurerm_linux_web_app.",
  ],
  validation: [
    "npx tsc --noEmit, npx eslint --max-warnings 0, terraform fmt -check -recursive, and terraform validate all pass clean.",
    "npm run test:unit: 266 passed, 0 failed across 43 files (up from 256/42), including the new mfa-setup-required.test.ts.",
    "Real Playwright e2e runs against a locally built standalone server with a real Docker Postgres (TEST_DB_ACTIONS/TEST_MFA_FLOWS=true): sign-up.spec.ts, mfa-flow.spec.ts, accessibility.spec.ts, and the new mfa-setup-required.spec.ts (both its TOTP-confirmed and Email-OTP paths) all pass - 12/12 across the full run.",
    "Directly reproduced the mid-enrolment gap being closed with a standalone script before writing the fix: an unconfirmed TOTP secret still redirected every other route to /mfa-setup; only after a real generated code was confirmed did access unlock.",
  ],
  visibility: "public",
};
