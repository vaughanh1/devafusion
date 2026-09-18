import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "mfa-route-and-crypto-test-coverage",
  date: "2026-09-17",
  title: "Closing the MFA matrix's test-coverage gap - every backend route, every crypto/cache module",
  summary:
    "None of the five new MFA backend routes or the security-critical crypto/cache modules (encrypted-column-cipher, backup-code-hash, mfa-session-cache, mfa-export-handler, three Drizzle repositories) had any dedicated test coverage - a real gap surfaced only after being asked directly what was still missing. Closed with 90 new tests across 12 files, and one genuine production bug found and fixed in the process: backup codes could never have actually advanced or completed the MFA matrix.",
  tags: ["security", "typescript", "testing"],
  decisions: [
    "Found and fixed a real bug while writing two-factor/verify's route test: the 'advance the matrix' logic filtered remainingFactors by the literal submitted factorType value, which is always a no-op for a backup_code submission (the string 'backup_code' never appears in remainingFactors, which only ever holds real factor names). Backup codes could never have actually completed the MFA matrix in production - fixed by resolving the actually-satisfied factor as remainingFactors[0] regardless of which factorType value was used to satisfy it.",
    "Used real PGlite (not mocked Drizzle query builders) for the three new repository test suites, mirroring features/auth/__tests__/rate-limit.test.ts's established 'prove it against something real' pattern - DrizzleUserSecurityRepository's suite proves the encryptedSecretText customType's transparent encrypt/decrypt round trip through an actual Drizzle query, not an assumption about how the customType behaves.",
    "Replaced the test coverage lost when two-factor-secret-cipher.ts (and its test suite) was removed in an earlier slice in favour of encrypted-column-cipher.ts - that removal deleted real round-trip/tamper-detection tests without anything replacing them until now.",
  ],
  milestones: [
    "Added features/auth/mfa/__tests__/encrypted-column-cipher.test.ts, backup-code-hash.test.ts, and mfa-session-cache.test.ts - direct unit tests for the three previously-untested security-critical library modules.",
    "Added features/auth/mfa/__tests__/drizzle-backup-codes-repository.test.ts, drizzle-trusted-devices-repository.test.ts, and drizzle-user-security-repository.test.ts using real in-memory PGlite Postgres.",
    "Added features/auth/mfa/__tests__/mfa-export-handler.test.ts asserting the raw secret and trusted-device token are never present in a SAR export payload, even when the underlying repositories return them.",
    "Added app/api/auth/login-step1/__tests__/route.test.ts, two-factor/verify/__tests__/route.test.ts, two-factor/enrol/__tests__/route.test.ts, two-factor/confirm/__tests__/route.test.ts, and app/api/user/security/settings/__tests__/route.test.ts - mocking dependencies exactly as the pre-existing app/api/account/export/__tests__/route.test.ts already established.",
    "Fixed the backup-code advancement bug in app/api/auth/two-factor/verify/route.ts, caught directly by the new route test.",
  ],
  validation: [
    "npm run typecheck and npm run lint (eslint --max-warnings 0) both passed clean.",
    "npm run test:unit: 212 passed, 0 failed across 34 files (up from 116/22 before this addendum - 90 new tests added).",
    "npm run build succeeded with no new warnings.",
    "terraform fmt -check and terraform validate both passed for infrastructure/app (no infra changes in this addendum, re-verified regardless).",
  ],
  visibility: "public",
};
