import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "mfa-matrix-frontend-and-accessibility",
  date: "2026-09-17",
  title: "Closing the MFA matrix gaps: custom domain, real QR images, accessible codes, and the actual frontend",
  summary:
    "A prior slice (self-hosted-mfa-matrix) shipped only backend routes for the MFA matrix with no frontend wiring, no e2e coverage, an Azure-managed sender domain, and a bare otpauth:// URI instead of a scannable image - none of it was reachable through the actual website. This addendum closes every gap: a verified custom domain (donotreply@devafusion.net with real DKIM/SPF/DMARC), a real PNG QR code with an accessible text fallback, screen-reader-friendly spaced OTP digits, the missing login/enrolment UI, a /legal disclosure section, and a genuine bug fix (login-step1 was silently missing the form-timing-token field required by auth.ts's before-hook, which runs for direct auth.api calls too).",
  tags: ["accessibility", "gdpr", "security", "typescript", "terraform"],
  decisions: [
    "Switched infrastructure/app/modules/email's domain_management from AzureManagedDomain to CustomerManaged against devafusion.net, per an explicit product decision that MFA emails must come from a real, brand-trusted sender rather than a *.azurecomm.net address. Azure's own verification_records output is wired straight into new azurerm_dns_* resources on the existing devafusion_net zone - domain-ownership TXT, SPF TXT, DKIM/DKIM2 CNAME - verification is automatic (15-30 minute DNS propagation) with no manual 'click verify' step.",
    "Kept the sender local-part as donotreply@ rather than noreply@ - a custom Sender Username (the Azure feature that would allow a different local-part) has no Terraform resource in the azurerm provider today (Portal/CLI/PowerShell only), and donotreply@devafusion.net was confirmed as acceptable rather than introducing an unsupported-in-Terraform manual step.",
    "Rendered the TOTP enrolment QR as a real PNG data URI (qrcode npm package) instead of returning the bare otpauth:// URI string - most email clients strip inline images from unfamiliar schemes and no client can scan a raw URI string. Always shows the base32 secret as selectable text alongside the image (next/image with unoptimized, since a data URI has nothing for the image optimizer to fetch) so a user who cannot scan a QR code can still enrol.",
    "Added a dedicated accessible-OTP formatter spacing every digit ('1 2 3 4 5 6', never '123456' or '123 456') - a bare digit run is read by every major screen reader, and spoken aloud by a sighted user, as one large number rather than six discrete characters. Applied to the email-OTP body; MfaChallengeForm strips the spaces back out before submitting so a user who copies the formatted text verbatim still succeeds.",
    "Found and fixed a real bug while wiring the frontend: auth.ts's hooks.before timing-token check runs for every auth.api.* call, including a direct auth.api.signInEmail() call, not only router-dispatched requests - confirmed directly against better-auth's compiled dispatch.mjs (before-hooks read the raw body before the endpoint's own zod schema validates it). login-step1 was silently missing formTimingToken entirely; every real call would have failed closed with FORM_TIMING_CHECK_FAILED, and this had zero test coverage until this slice's e2e spec.",
    "Added a TEST_MFA_FLOWS-gated e2e spec (previously a documented but unused toggle in src/web/__tests__/AGENTS.md) exercising the real sign-up/enrol/confirm/log-out/log-in/challenge round trip against a real Postgres connection, using the real otpauth library to generate valid codes - mirrors sign-up.spec.ts's existing TEST_DB_ACTIONS gating pattern exactly, since pipelines/ci/web.yml's E2ETests job has no PostgreSQL sandbox wired up yet.",
  ],
  milestones: [
    "infrastructure/app/modules/email: CustomerManaged domain, verification_records output; environments/dev/dns.tf: 5 new azurerm_dns_* resources (domain verification, SPF, DKIM, DKIM2, DMARC) on the devafusion_net zone.",
    "Added features/auth/mfa/totp-qr-code.ts (qrcode-based PNG rendering) and features/auth/mfa/format-otp-for-accessibility.ts (spaced-digit formatting), both with dedicated unit tests against the real underlying libraries.",
    "Added components/auth/mfa-challenge-form.tsx (the sequential-matrix login challenge) and components/account/totp-enrolment.tsx (QR/secret/backup-codes display plus confirmation), wired into log-in-form.tsx and mfa-settings-dashboard.tsx respectively.",
    "Rewrote app/log-in/log-in-form.tsx to call /api/auth/login-step1 instead of Better Auth's own authClient.signIn.email(), and updated its test suite to mock fetch instead of the now-unused authClient.",
    "Fixed app/api/auth/login-step1/route.ts to forward formTimingToken into signInEmail's body, closing the real FORM_TIMING_CHECK_FAILED bug described above.",
    "Added a Multi-factor authentication (MFA) section to app/legal/page.tsx (Azure Communication Services sub-processor disclosure, lawful basis, trusted-device cookie, in-memory progress cache minimisation) and updated its 'What is not collected' section.",
    "Added qrcode/@types/qrcode as new dependencies (src/web/package.json) - npm audit confirmed zero new vulnerabilities.",
    "Corrected docs/adr/0015 with an explicit cost note: Azure Communication Services Email has no free tier (billed per email sent plus per MB transferred) - this was omitted when the Resend-to-ACS swap was first proposed.",
  ],
  validation: [
    "npm run typecheck and npm run lint (eslint --max-warnings 0) both passed clean.",
    "npm run test:unit: 112 passed, 0 failed across 21 files (up from 91/16 - new coverage for MfaChallengeForm, TotpEnrolment, MfaSettingsDashboard, format-otp-for-accessibility, totp-qr-code, and a rewritten log-in-form suite).",
    "npm run build succeeded - every route (including the rewritten log-in page and account page) compiled with no new warnings; next/image's unoptimized data-URI path produced no build-time complaint.",
    "terraform fmt -check and terraform validate both passed for infrastructure/app.",
    "npm audit: 0 new vulnerabilities beyond the already-documented, accepted drizzle-kit/esbuild/lighthouse dev-tooling advisories.",
    "tests-e2e/mfa-flow.spec.ts added but gated behind TEST_MFA_FLOWS=true (no PostgreSQL sandbox in CI yet) - not yet run against a real database in this session; flagged as an open item, not silently assumed to pass.",
  ],
  visibility: "public",
};
