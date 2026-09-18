import "server-only";

import { LRUCache } from "lru-cache";

// Test-only capture of the real verification/reset link auth.ts's
// sendVerificationEmail/sendResetPassword callbacks dispatch - lets
// tests-e2e/sign-up.spec.ts and mfa-flow.spec.ts click through the
// same real link a genuine email would deliver, without needing to
// intercept an actual inbox or duplicate Better Auth's own internal
// JWT-signing secret. Gated by isTestVerificationCaptureEnabled()
// below (TEST_DB_ACTIONS or TEST_MFA_FLOWS, src/web/__tests__/
// AGENTS.md's documented toggles) - auth.ts only calls capture() at
// all when one of those is set, and the read route
// (app/api/test-only/verification-link) 404s outright otherwise, so
// this has zero surface in a real deployment.
//
// Same in-memory LRU pattern as mfa-session-cache.ts, for the same
// reason: this is throwaway, single-instance-local test state with
// no legitimate reason to survive longer than the few seconds a
// Playwright test takes to fetch it, never a database row.
const TEST_VERIFICATION_LINK_CACHE_MAX_ENTRIES = 200;
const TEST_VERIFICATION_LINK_TTL_MS = 60_000;

const testVerificationLinkCache = new LRUCache<string, string>({
  max: TEST_VERIFICATION_LINK_CACHE_MAX_ENTRIES,
  ttl: TEST_VERIFICATION_LINK_TTL_MS,
});

export function isTestVerificationCaptureEnabled(): boolean {
  return (
    process.env.TEST_DB_ACTIONS === "true" ||
    process.env.TEST_MFA_FLOWS === "true"
  );
}

export function captureTestVerificationLink(
  email: string,
  url: string,
): void {
  testVerificationLinkCache.set(email.toLowerCase(), url);
}

export function consumeTestVerificationLink(
  email: string,
): string | undefined {
  const key = email.toLowerCase();
  const url = testVerificationLinkCache.get(key);
  testVerificationLinkCache.delete(key);
  return url;
}
