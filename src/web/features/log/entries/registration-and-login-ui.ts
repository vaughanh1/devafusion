import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "registration-and-login-ui",
  date: "2026-09-16",
  title: "Registration and login UI, wired to the existing Better Auth backend",
  summary:
    "Built email/password sign-up, log-in, and log-out UI on top of the identity backend from the previous slice - the first user-facing consumer of Better Auth. Deliberately scoped to credentials only: no MFA enrollment/challenge UI yet, since no account has MFA enabled and that is a separate future slice. Caught and fixed a real regression before it shipped: an initial server-side session read in the header would have forced every page on the site into dynamic rendering.",
  tags: ["security", "architecture", "typescript"],
  decisions: [
    "Scoped this slice to email/password sign-up/log-in/log-out only, deliberately excluding MFA enrollment and challenge UI - no account has MFA enabled yet (no enrollment flow exists), so there is nothing to challenge, and building enrollment UI is its own separate slice.",
    "Implemented the OWASP-documented 'redirect back to what the user wanted' pattern (features/auth/safe-redirect.ts) rather than a naive redirect query param - validates the target is a same-site relative path, explicitly rejecting protocol-relative URLs (//evil.com) and javascript: schemes, falling back to / on anything unsafe. Passed through as Better Auth's own callbackURL option rather than a manual post-auth redirect.",
    "Caught a real rendering regression during the first build: reading auth.api.getSession() in SiteHeader (rendered via app/layout.tsx on every page) forced every previously-static page (/, /about, /log, /projects, etc.) into dynamic, server-rendered-on-demand rendering - confirmed directly via the build output's route table before and after. Reverted to a purely client-side session read (Better Auth's own authClient.useSession() hook) in a small leaf component instead, restoring static generation everywhere except the two auth pages themselves, which already need dynamic rendering to read the redirect query param.",
    "Log-in shows a single generic 'Invalid email or password' message regardless of which credential was wrong, rather than surfacing Better Auth's own more specific error text - distinguishing 'no such user' from 'wrong password' enables account enumeration.",
    "No new dependency added for form interaction testing (@testing-library/user-event is not in package.json) - used the already-available fireEvent from @testing-library/react instead, per the Standardized Tooling rule against introducing a dependency on a whim.",
  ],
  milestones: [
    "Added features/auth/auth-client.ts (createAuthClient from better-auth/react, no plugins - MFA is self-built, not Better Auth's twoFactorClient) and features/auth/safe-redirect.ts (isSafeRedirectPath/resolveSafeRedirectPath).",
    "Added app/sign-up/{page.tsx,sign-up-form.tsx} and app/log-in/{page.tsx,log-in-form.tsx} - Server Component shells reading and validating the ?redirect= searchParam, wrapping 'use client' form leaves.",
    "Added components/navigation/account-nav.tsx - a 'use client' leaf using authClient.useSession() to show a log-in link (with the current path as the redirect target) or a log-out button, wired into components/layout/site-header.tsx.",
    "Both /sign-up and /log-in are noindex,follow (no unique indexable content, should never rank ahead of the content pages they gate).",
    "Added unit tests for safe-redirect.ts (16 cases covering every rejection path) and component tests for SignUpForm, LogInForm, and AccountNav (mocking authClient and next/navigation).",
  ],
  validation: [
    "Confirmed the SiteHeader rendering regression and its fix directly against next build's own route table output (○ Static vs ƛ Dynamic markers), not just by inspection - before the fix, /, /about, /log, /projects etc. all showed ƛ; after, only /sign-up and /log-in do.",
    "Ran the full real flow end-to-end against a genuine local Docker Postgres 16 (per src/web/AGENTS.md's Local Postgres for Migration Testing workflow) and the actual dev server, via direct API calls (not just the unit/component tests): sign-up (real user row confirmed via psql), get-session (valid session confirmed), sign-in, wrong-password rejection (401), get-session after sign-out (confirmed null - session genuinely invalidated), and sign-out's CSRF/origin protection (confirmed it correctly rejects a request with no Origin header and accepts one with a matching same-origin header, exactly what a real browser fetch sends).",
    "npm run lint (zero warnings), npm run typecheck, npm run build, and npm run test:unit (52 tests across 9 files, all passing) all run clean after every change in this slice.",
    "Confirmed authClient.useSession()'s return shape ({ data, isPending }) directly against better-auth's own shipped type declarations before relying on it, rather than assuming from documentation prose alone.",
  ],
  visibility: "public",
};
