import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "enforce-email-verification",
  date: "2026-09-18",
  title: "Enforced email verification, backed by real ACS delivery",
  summary:
    "Sign-up previously accepted any email address with no proof it was reachable. With Azure Communication Services' custom domain now verified end-to-end, requireEmailVerification is enabled: a fresh sign-up no longer gets an immediate session, and both the verification and password-reset links dispatch through the same ACS infrastructure the MFA email-OTP factor already uses. The sign-up and log-in forms, and the gated E2E specs that exercise them, were updated to match the new flow rather than assuming an immediate session.",
  tags: ["gdpr", "typescript"],
  decisions: [
    "requireEmailVerification lives on emailAndPassword, sendVerificationEmail/sendOnSignUp/autoSignInAfterVerification on the separate top-level emailVerification block - confirmed directly against the installed package's own init-options.ts rather than guessed from the docs, which truncated exactly at the relevant section.",
    "A generic sendTransactionalLinkEmail(toEmail, subject, body) sender is shared by both the verification and password-reset callbacks, rather than one function per use case - both send a single link to a single recipient via the same verified ACS sender; only the copy differs.",
    "login-step1's own signInEmail call now distinguishes Better Auth's 403 EMAIL_NOT_VERIFIED from a genuine 401 credential mismatch, rather than collapsing both into the existing generic 'Invalid email or password.' message - confirmed directly against the installed package's sign-in.mjs that these are actually different statuses.",
    "sign-up.spec.ts and mfa-flow.spec.ts (both already gated behind TEST_DB_ACTIONS/TEST_MFA_FLOWS) needed a way to get past verification without a real inbox - a test-only capture cache (test-verification-link-cache.ts) and 404-unless-gated route let them fetch and follow the exact real link auth.ts dispatches, rather than intercepting email or duplicating Better Auth's internal JWT secret. The route has no path to succeed against a real deployment: it 404s before touching the cache unless one of the same two flags is set.",
    "Checked for GDPR compliance and accessibility: /legal's Azure Communication Services disclosure was scoped only to email-based MFA and did not yet cover the new verification/reset emails, and neither email's own body stated its link's expiry (unlike the existing OTP email's '3 minutes' text) - both fixed in this same change. Both links use Better Auth's own default 1-hour expiresIn/resetPasswordTokenExpiresIn, unset in auth.ts.",
  ],
  milestones: [
    "app/legal/page.tsx: disclosed that every account (not only those with email-based MFA enabled) now has its email address sent through Azure Communication Services for verification/reset links, and that each link expires after 1 hour - the prior copy scoped ACS narrowly to the MFA section and would have understated processing once this shipped.",
    "email-verification-content.ts and email-reset-password-content.ts: both bodies now state the 1-hour link expiry, matching the existing OTP email's own '3 minutes' disclosure rather than leaving it unstated.",
    "features/compliance/known-data-processors.ts + legal-disclosure-coverage.test.ts: a new mechanical, CI-enforced check that fails when a third-party processor's real call site (import specifier/hostname) exists in source with no matching disclosure text on /legal - added specifically because no commercial cookie/tracker scanner can see a server-side call with zero client-side footprint, and this session's own gap would otherwise have shipped undetected by tooling. Documented as presence-only, not scope-accuracy, in both the registry's own comment and src/web/AGENTS.md - it would not have caught the actual regression (ACS was always mentioned, just narrowly scoped to MFA), only a processor with zero disclosure at all.",
    "auth.ts: requireEmailVerification: true; emailVerification.sendVerificationEmail/sendOnSignUp/autoSignInAfterVerification wired to the real ACS sender; sendResetPassword now dispatches for real instead of logging and skipping.",
    "features/auth/acs-email-client.ts: ACS client/sender-address lookup factored out of mfa/send-email-otp.ts so the new send-transactional-link-email.ts caller doesn't duplicate it.",
    "app/sign-up/sign-up-form.tsx: shows a 'check your inbox' message instead of redirecting when sign-up returns no session token.",
    "app/log-in/log-in-form.tsx and app/api/auth/login-step1/route.ts: a 403 (email not verified) now surfaces its own message rather than the generic invalid-credentials one.",
    "features/auth/test-verification-link-cache.ts + app/api/test-only/verification-link/route.ts: test-only, flag-gated capture/read of the real verification link for the E2E specs.",
    "Confirmed end-to-end against a real running server and real local Postgres (not just unit tests): a direct sign-up call returned token: null with emailVerified: false, the captured link's JWT payload carried the right email, following it produced a real 302 redirect, and the database showed both email_verified flipping to true and a real session row being created.",
  ],
  validation: [
    "npm run typecheck and npm run lint (eslint --max-warnings 0) both passed clean.",
    "npm run test:unit: 249 passed, 0 failed across 41 files (up from 226/36) - new coverage for the check-your-email sign-up path, the 403-vs-401 log-in distinction, the test-verification-link-cache module and its route, the expiry-disclosure content of both new email bodies, and the new legal-disclosure-coverage suite itself (including a fabricated-processor proof of what it does and does not catch).",
    "Manual end-to-end verification against a real server (npm run start) and real local Postgres: sign-up, link capture, link follow, and the resulting emailVerified/session DB state were all inspected directly, not just asserted through mocks.",
  ],
  visibility: "public",
};
