import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "qa-automation-framework",
  date: "2026-08-28",
  title: "Establish the Vitest and Playwright testing framework",
  summary:
    "Added a 3-tier testing gate (Vitest unit/component, Playwright E2E, Docker-based visual regression) to the web application with native Azure DevOps dashboard reporting, while enforcing strict budget, speed, and environment-isolation constraints.",
  tags: ["testing", "vitest", "playwright", "devops", "accessibility"],
  decisions: [
    "Use Vitest with the v8 coverage provider for unit/component tests, printing a terminal summary and emitting LCOV and JUnit reporting assets rather than gating on an arbitrary 100% coverage number.",
    "Use Playwright for E2E, defaulting to a single chromium project via a PLAYWRIGHT_BROWSER_TARGET environment variable rather than downloading all browser engines on every run.",
    "Capture Playwright traces only on first retry and video only on failure so a passing test leaves zero artifact footprint against the 2 GB Azure DevOps storage quota, and cap CI workers at 2 to respect the hosted agent's 7 GB memory ceiling.",
    "Run visual regression specs inside the official mcr.microsoft.com/playwright Docker image in a dedicated pipeline job so font-rendering differences between local OS environments and the Ubuntu runner never produce false-positive diffs.",
    "Read ad hoc feature-suite toggles (TEST_DB_ACTIONS, TEST_MFA_FLOWS) directly from process.env in the test runners so a suite can be included or excluded from the Azure DevOps 'Run Pipeline' variables panel without a commit to develop.",
    "Establish src/web/__tests__/AGENTS.md as a dedicated testing spoke enforcing test locality (adjacent __tests__ directories for unit tests, a centralized tests-e2e/ tree for E2E), single-responsibility test cases, and an inline 'why' annotation requirement for any deliberately uncovered branch.",
    "Exempt the app/**/__tests__ directory name from the NEXT_JS_APP_ROUTER_CASE folder-naming rule in eslint.config.mjs, since it holds test files rather than a route segment.",
  ],
  milestones: [
    "Added vitest.config.ts, vitest.setup.ts, and playwright.config.ts implementing the coverage, artifact-isolation, worker-ceiling, and browser-target configuration described above.",
    "Added src/web/__tests__/AGENTS.md and wired it into the root AGENTS.md Spoke Index.",
    "Exported theme-selector.tsx's cookie parsing and token-validation helpers and added components/theme/__tests__/theme-selector.test.tsx, plus app/__tests__/robots.test.ts and app/__tests__/sitemap.test.ts covering the site's metadata-generation utilities.",
    "Added tests-e2e/home-layout.spec.ts validating pre-hydration flash-guard behaviour, the absence of raw tracking <script> tags, and structural accessibility via @axe-core/playwright (with color-contrast explicitly deferred to the manual WCAG review already established for this project).",
    "Added a Test stage to pipelines/ci/web.yml with UnitTests, E2ETests, and VisualRegression jobs, npm/Playwright binary caching, PublishTestResults@2 and PublishCodeCoverageResults@2 wiring, and Run Pipeline parameters for the browser target and feature-suite toggles.",
  ],
  validation: [
    "npm run lint, npm run typecheck, and npm run build all passed clean.",
    "npm run test:unit passed all 13 Vitest cases across the three new unit suites, with terminal, LCOV, and JUnit coverage output confirmed locally.",
    "npm run test:e2e passed all 3 Playwright specs against a locally built standalone server, including the axe-core structural accessibility check.",
    "Confirmed via git status that coverage/, tests-e2e/.playwright-output/, and other generated test artifacts are excluded by the updated src/web/.gitignore and never staged.",
  ],
  visibility: "public",
};
