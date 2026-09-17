import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "mfa-ci-sandbox-and-deletion-handler-coverage",
  date: "2026-09-17",
  title: "Wired a real Postgres sandbox into the E2ETests CI job; closed the last MFA test-coverage gap",
  summary:
    "TEST_DB_ACTIONS and TEST_MFA_FLOWS previously only ran when a human manually set them locally - pipelines/ci/web.yml's E2ETests job passed the toggles through as env vars with no PostgreSQL sandbox for the connection they gate to reach. Wired in the same postgres:16 service container and citext+migrate steps the pre-existing LighthouseCI job already uses, and verified the exact same sequence locally before trusting the YAML. Also closed mfa-deletion-handler.ts's test-coverage gap, the last untested security-critical module from the earlier coverage-closing pass.",
  tags: ["security", "typescript", "testing", "ci"],
  decisions: [
    "Reused the LighthouseCI job's exact resources.containers: postgres service pattern for E2ETests rather than inventing a second Postgres provisioning approach, keeping both CI Postgres sandboxes in this pipeline consistent.",
    "Verified the new CI wiring by actually reproducing it locally (fresh postgres:16 container, the same citext-extension + drizzle-kit migrate script, the same env vars) before trusting terraform-style 'looks right' YAML - the full 12-spec Playwright suite passed with TEST_DB_ACTIONS=true and TEST_MFA_FLOWS=true both enabled.",
    "Generated a correctly-sized (32-byte, base64-encoded) throwaway MFA_ENCRYPTION_KEY fixture for the E2ETests job, checked with Buffer.from(...).length rather than assumed - the same class of mistake (a 34-byte key) had already been caught once locally in an earlier session.",
  ],
  milestones: [
    "pipelines/ci/web.yml: added a postgres service container, a citext+drizzle-kit-migrate step, and DATABASE_URL/BETTER_AUTH_SECRET/BETTER_AUTH_URL/MFA_ENCRYPTION_KEY/TURNSTILE_SECRET_KEY/FORM_TIMING_TOKEN_SECRET env vars to the E2ETests job.",
    "Updated tests-e2e/sign-up.spec.ts, tests-e2e/mfa-flow.spec.ts, and src/web/__tests__/AGENTS.md to stop stating no CI Postgres sandbox exists.",
    "Added features/auth/mfa/__tests__/mfa-deletion-handler.test.ts (real PGlite) covering the full cascade, the surviving audit log entry, a distinct admin performedBy, cross-user isolation, and the no-existing-rows case.",
  ],
  validation: [
    "npm run typecheck and npm run lint (eslint --max-warnings 0) both passed clean.",
    "npm run test:unit: 218 passed, 0 failed across 35 files (up from 213/34).",
    "Reproduced the new CI pipeline steps locally against a fresh postgres:16 Docker container: citext extension, drizzle-kit migrate, then the full Playwright suite (12 passed) with TEST_DB_ACTIONS=true and TEST_MFA_FLOWS=true.",
    "npm run build succeeded with no new warnings.",
    "python -c \"import yaml; yaml.safe_load(...)\" confirmed pipelines/ci/web.yml is still valid YAML after the edit.",
  ],
  visibility: "public",
};
