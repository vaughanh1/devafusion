import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "mfa-trusted-devices-issuer-and-reenrol",
  date: "2026-09-18",
  title: "Trusted devices, TOTP issuer casing, and a self-service re-enrolment path",
  summary:
    "Saving '30 days' in the security settings dashboard updated the mfa_frequency policy column but never actually trusted the current device - trusted_devices stayed empty until the next full login challenge, so the setting had no visible effect until then. Fixed by trusting the current device immediately on save. Also fixed a TOTP issuer casing typo ('DevaFusion' instead of the real brand casing, 'Devafusion') and added a self-service path to reset a lost/reset authenticator app, gated behind re-confirming the account password.",
  tags: ["accessibility", "gdpr", "typescript"],
  decisions: [
    "Trusting the current device on save reuses the exact same trusted_devices row shape and cookie the login-time flow already writes, rather than introducing a second code path.",
    "Re-enrolment reuses /api/auth/two-factor/enrol itself rather than a separate route - the only difference is a password re-confirmation gate when the account already has a confirmed factor, and the frontend discovers which case it's in from the server's own response rather than tracking that state itself.",
    "Re-enrolment flips twoFactorEnabled back to false for the duration of the flow, closing a real lockout window: leaving the prior secret marked enabled while a new, unconfirmed one replaces it would strand the account if the user abandoned the flow before confirming the new code.",
    "The frontend tells 'password required' apart from a generic 400 by message content rather than a new status code - a dedicated code for one caller would be a heavier change than reusing what the route already returns.",
  ],
  milestones: [
    "app/api/user/security/settings/route.ts: saving mfaFrequency: '30_days' now creates a trusted_devices row and sets the cookie on the response.",
    "app/api/auth/two-factor/enrol/route.ts: TOTP_ISSUER corrected to 'Devafusion'; re-enrolment now requires and verifies the current password, and resets twoFactorEnabled to false until the new code is confirmed.",
    "components/account/totp-enrolment.tsx: added a 'needs-password' step that prompts for and resubmits with the current password when the server reports an existing confirmed factor.",
  ],
  validation: [
    "npm run typecheck and npm run lint (eslint --max-warnings 0) both passed clean.",
    "npm run test:unit: 226 passed, 0 failed across 36 files (up from 221/36) - new coverage for both the trusted-device-on-save behaviour and the full re-enrolment path (missing password, wrong password, correct password resetting twoFactorEnabled).",
  ],
  visibility: "public",
};
