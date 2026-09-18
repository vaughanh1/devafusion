import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "form-error-aria-invalid",
  date: "2026-09-18",
  title: "Added aria-invalid to every form error state, alongside aria-describedby",
  summary:
    "Checked as requested whether form errors were screen-reader compliant: every auth/account form's error state (SignUpForm, LogInForm, ForgetPasswordForm, ResetPasswordForm, MfaChallengeForm, TotpEnrolment, MfaSettingsDashboard, DeleteAccountForm) already wired aria-describedby correctly, but none set aria-invalid on the affected input(s). aria-describedby alone links a field to its error text but does not itself announce 'invalid entry' when the field receives focus - aria-invalid is what does that. Fixed across every form, plus the shared PasswordField component.",
  tags: ["accessibility", "typescript"],
  decisions: [
    "aria-invalid is always rendered as an explicit boolean ('true'/'false'), never omitted - unlike aria-describedby's undefined-when-clean pattern, aria-invalid has no 'absent means valid' convention a screen reader can rely on.",
    "PasswordField's new isInvalid prop is a plain boolean, not the error string itself, keeping the same separation of concerns as its existing describedBy prop (the error's id, not its content).",
    "Documented the pairing requirement in src/web/AGENTS.md's existing WCAG pre-merge checklist (Form error state, SC 3.3.1/4.1.2) so a new form with an error state follows the pattern by default rather than only being caught on a manual check like this one.",
  ],
  milestones: [
    "components/auth/password-field.tsx: added isInvalid prop, rendered as aria-invalid on the underlying input.",
    "Added aria-invalid={!!error} beside every existing aria-describedby site across app/sign-up, app/log-in, app/forget-password, app/reset-password, app/account/delete-account-form.tsx, components/account/totp-enrolment.tsx, components/account/mfa-settings-dashboard.tsx, and components/auth/mfa-challenge-form.tsx - 12 sites in total, all now paired.",
    "New tests: components/auth/__tests__/password-field.test.tsx (aria-invalid defaults false, becomes true, reveal toggle still works), plus new assertions in sign-up-form.test.tsx and log-in-form.test.tsx confirming every field flips to aria-invalid=true on a server error and starts false.",
  ],
  validation: [
    "npm run typecheck and npm run lint (eslint --max-warnings 0) both passed clean.",
    "npm run test:unit: 254 passed, 0 failed across 42 files (up from 249/41) - new coverage specifically for the aria-invalid behaviour this change added.",
  ],
  visibility: "public",
};
