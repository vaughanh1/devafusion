import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "mfa-e2e-verification-and-dns-hardening",
  date: "2026-09-17",
  title: "Actually running the MFA e2e spec found a real bug; hardened the ACS DNS name assumption away",
  summary:
    "tests-e2e/mfa-flow.spec.ts had been written but never executed. Running it for real against a local Postgres container and a real browser found a genuine bug: TOTP enrolment's confirmation step was a nested <form>, which HTML forbids - a real click submitted the outer settings form instead of calling the confirm API, so enrolment could never actually complete through the UI. Fixed, and the full sign-up-to-authenticated-session flow now passes end-to-end. Separately, the previously-flagged 'must verify against a live Azure subscription' DNS record-name-format caveat has been resolved without needing that live check, using a documented Terraform function guarantee.",
  tags: ["security", "typescript", "testing", "terraform"],
  decisions: [
    "Ran tests-e2e/mfa-flow.spec.ts for real (TEST_MFA_FLOWS=true) against a fresh local postgres:16 Docker container with the real migrated schema and a real next build standalone server - not just left gated and unexecuted.",
    "Found a real production bug: TotpEnrolment rendered its own <form> for the confirmation step while always being mounted inside MfaSettingsDashboard's own outer <form> - nested forms are invalid HTML, and a real browser click submitted the outer form (full page reload) instead of ever calling /api/auth/two-factor/confirm. The existing Vitest/jsdom unit test did not catch this because fireEvent.click on a submit button inside jsdom does not reproduce a real browser's nested-form submission semantics - only real e2e coverage could have caught it.",
    "Resolved the DNS verification_records[*].name fully-qualified-vs-relative ambiguity without a live Azure subscription: Terraform's trimsuffix() is documented to be a no-op whenever its suffix argument isn't present at the end of the string, so chaining it against every plausible fully-qualified suffix form is safe regardless of which form Azure actually returns.",
  ],
  milestones: [
    "Fixed components/account/totp-enrolment.tsx: confirmation step is now a plain <div>, confirm button is type=\"button\" with an explicit onClick instead of a form submission.",
    "Added a regression unit test asserting TotpEnrolment never renders a nested <form>.",
    "tests-e2e/mfa-flow.spec.ts passed for real: sign-up -> TOTP enrolment -> confirmation -> log-out -> log-in -> sequential-matrix challenge -> authenticated session, against a real Postgres database and a real Chromium browser.",
    "Hardened infrastructure/app/environments/dev/dns.tf's four ACS verification DNS records (domain, spf, dkim, dkim2) to chain trimsuffix() against every plausible fully-qualified suffix form, removing the prior 'must be verified before merge' caveat entirely.",
  ],
  validation: [
    "npm run typecheck and npm run lint (eslint --max-warnings 0) both passed clean.",
    "npm run test:unit passed, including the new nested-form regression test.",
    "tests-e2e/mfa-flow.spec.ts passed against a real local Postgres container and a real browser (1 passed).",
    "terraform fmt -check and terraform validate both passed for infrastructure/app.",
  ],
  visibility: "public",
};
