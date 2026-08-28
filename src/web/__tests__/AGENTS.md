# Testing Spoke

Governs every automated test in `src/web`. Universal rules (Persona, Git
discipline, Pre-Flight Gate, PR pipeline) live in the root
[`AGENTS.md`](../../../AGENTS.md); the Next.js/TypeScript/Tailwind rules
for the application itself live in [`src/web/AGENTS.md`](../AGENTS.md).
This file is the single root spoke for both the scattered per-feature
`__tests__/` directories and the centralized `tests-e2e/` tree, since no
single physical directory contains every test in this application.

## Locality

- **Unit/component tests live adjacent to their feature slice**, inside a
  `__tests__/` directory next to the code under test (e.g.
  `components/theme/__tests__/theme-selector.test.tsx`,
  `app/__tests__/robots.test.ts`). Never centralize a unit test in a
  top-level `tests/` directory away from the code it exercises — that
  breaks the "find the test next to the file" workflow this convention
  exists for.
- **Naming:** `kebab-case.test.ts` / `kebab-case.test.tsx`, matching the
  `kebab-case` filename convention already enforced on application code
  by `eslint-plugin-check-file` (`src/web/AGENTS.md`).
- **Global integration and E2E specs live in `src/web/tests-e2e/`**, a
  single centralized tree, because these specs exercise routes and
  cross-component flows rather than a single feature slice and have no
  single adjacent "home". Naming: `kebab-case.spec.ts`; visual regression
  specs are further suffixed `kebab-case.visual.spec.ts` so they can be
  selected as their own Playwright project (see below).

## Code Standards

- **Single-responsibility test cases:** one behavior, one assertion
  concern per `it`/`test` block. Do not chain unrelated assertions about
  different behaviors into a single test case — split them so a failure
  name tells you exactly what broke.
- **Absolute isolation of test states:** no test may depend on execution
  order, a shared mutable module-level fixture, or state left behind by
  another test. Vitest: reset DOM/cookie/localStorage state in
  `afterEach`. Playwright: every spec gets a fresh browser context
  (Playwright's default) — never reuse a page across unrelated specs.
- **No redundant code blocks:** factor shared setup into a local helper
  or fixture in the same `__tests__` directory; do not copy-paste the
  same render/setup boilerplate across test files.
- **No `any`:** test code follows the same TypeScript strictness as
  application code (`src/web/AGENTS.md`) — every mock, fixture, and
  helper has an explicit type.

## Coverage Target & Transparency

- Target high, honest coverage of business logic (parsing, validation,
  formatting, metadata generation). **Do not chase 100% as a vanity
  metric** — a passthrough JSX wrapper with no branching logic does not
  need a dedicated test to hit an arbitrary percentage.
- The Vitest run always prints the native `v8` terminal coverage summary
  (`npm run test:unit`) showing exactly which lines/branches were missed,
  plus LCOV (`coverage/lcov.info`) and JUnit (`coverage/junit.xml`)
  artifacts for CI ingestion.
- **Uncovered-block annotation rule:** any source file that is
  deliberately left partially uncovered must carry an inline comment at
  the uncovered branch explaining *why* (e.g. "// defensive fallback for
  a malformed cookie value that a browser can never actually produce").
  A missing annotation on a knowingly-uncovered branch is a review
  blocker — it forces the "why" to be written down instead of silently
  accepted.

## Environment Toggles (No-Commit Controls)

Ad hoc feature-suite toggles are read directly from `process.env` inside
the test runners so a suite can be included/excluded from the Azure
DevOps "Run Pipeline" variables panel without a commit to `develop`:

- `TEST_DB_ACTIONS` (default unset/`false`) — gates any suite that
  depends on the ephemeral PostgreSQL Docker sandbox described in
  `pipelines/ci/web.yml`. There is no PostgreSQL integration yet; this
  flag exists so the first such suite only has to check it, not invent
  the wiring.
- `TEST_MFA_FLOWS` (default unset/`false`) — gates any suite depending on
  a future MFA/auth flow. Same rationale.
- `PLAYWRIGHT_BROWSER_TARGET` (default `chromium`) — selects the
  Playwright project/browser engine; see `playwright.config.ts`.
- Any new toggle follows the same `TEST_<AREA>` naming and must default
  to the cheapest/fastest behavior when unset, never to the most
  expensive.
- A toggled-off suite uses `describe.skip`/`test.skip` guarded by the
  flag, not a commented-out block (Universal Cross-Stack Standards, root
  `AGENTS.md`) — the test code stays compiled and readable, only its
  execution is skipped.

## Playwright Artifact & Performance Discipline

- `trace: 'on-first-retry'`, `video: 'retain-on-failure'`,
  `screenshot: 'only-on-failure'` — a passing test on its first attempt
  produces zero trace/video/screenshot artifacts. This is a hard budget
  constraint (2 GB Azure DevOps storage quota), not a preference; do not
  loosen these to `'on'` for local debugging convenience and then commit
  that change.
- `workers: process.env.CI ? 2 : undefined` is a memory ceiling for the
  hosted 7 GB RAM agent, not a suggestion. Do not raise it in CI.
- Visual regression specs (`*.visual.spec.ts`) only run against the
  pinned, official `mcr.microsoft.com/playwright` Docker image (see
  `pipelines/ci/web.yml`'s `Visual` job) so font-rendering differences
  between a contributor's OS and the Ubuntu pipeline runner never produce
  a false-positive diff. Do not add screenshot assertions to a spec that
  runs in the default `chromium` project on the bare hosted agent.
