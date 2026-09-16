import { defineConfig, devices } from "@playwright/test";

// Defaults strictly to chromium to minimize the 700 MB multi-browser
// binary download on every pipeline run (src/web/__tests__/AGENTS.md,
// root AGENTS.md Standardized Tooling). Pass another target explicitly
// via the Azure DevOps "Run Pipeline" variables panel when needed.
const browserTarget = process.env.PLAYWRIGHT_BROWSER_TARGET ?? "chromium";

const browserProjects: Record<string, (typeof devices)[string]> = {
  chromium: devices["Desktop Chrome"],
  firefox: devices["Desktop Firefox"],
  webkit: devices["Desktop Safari"],
};

const selectedDevice = browserProjects[browserTarget] ?? devices["Desktop Chrome"];

export default defineConfig({
  testDir: "./tests-e2e",
  outputDir: "./tests-e2e/.playwright-output",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Memory ceiling for the hosted 7 GB RAM Azure DevOps agent — do not
  // raise this in CI (root AGENTS.md cost/speed constraints).
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [
        ["junit", { outputFile: "./tests-e2e-results/junit.xml" }],
        // Feeds the Mocoding Playwright Azure DevOps extension's "Tests"
        // tab (UploadPlaywrightReport@1 in pipelines/ci/web.yml) with
        // full trace/video playback. That task only uploads this folder
        // on a build failure, so a passing run leaves it generated but
        // never persisted — no extra storage-quota cost on the 2 GB
        // budget (root AGENTS.md, High-Fidelity Overage Protection).
        ["html", { outputFolder: "playwright-report", open: "never" }],
        ["list"],
      ]
    : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    // Zero storage footprint on passing tests — only capture artifacts
    // on retry/failure, to stay inside the 2 GB Azure DevOps storage
    // quota (root AGENTS.md, High-Fidelity Overage Protection).
    trace: "on-first-retry",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // Font-safe snapshot layout: each project gets its own subdirectory so
  // a chromium-vs-webkit baseline never gets diffed against the wrong
  // engine's font metrics.
  snapshotPathTemplate:
    "{testDir}/__screenshots__/{projectName}/{testFilePath}/{arg}{ext}",
  projects: [
    {
      name: browserTarget,
      use: { ...selectedDevice },
    },
  ],
  webServer: {
    // next.config.ts enforces output: "standalone" (src/web/AGENTS.md),
    // which "next start" explicitly refuses to serve — run the same
    // standalone server entrypoint package.json's start script and the
    // production App Service deployment both use, against a plain
    // `next build` output (no static/public copy step needed locally).
    command: "npm run start",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // The standalone server binds to its container hostname by
      // default; force it to bind every interface so Playwright's own
      // 127.0.0.1 health-check (and the Docker-based VisualRegression
      // job) can reach it inside a container.
      HOSTNAME: "0.0.0.0",
      // ADR-0014: Cloudflare's own documented dummy Turnstile keys for
      // automated testing - explicitly named to cover Playwright by
      // Cloudflare's own testing docs, since a real Turnstile
      // challenge actively detects an automated browser as a bot and
      // would make this E2E suite flaky. 1x00000000000000000000AA
      // (sitekey) / 1x0000000000000000000000000000000AA (secret key)
      // is the documented "always passes" pair - not a real secret,
      // safe to commit (gitleaks has no reason to flag Cloudflare's
      // own published test fixture values).
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
      TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
      // form-timing-token.ts's HMAC key has no equivalent published
      // test fixture - any fixed value works here since this suite
      // never inspects the token's contents, only that the form
      // eventually submits successfully. Not a real secret (root
      // AGENTS.md Zero Hardcoded Secrets governs credentials with
      // real-world value; a throwaway local-test HMAC key has none).
      FORM_TIMING_TOKEN_SECRET: "playwright-e2e-test-fixture-key-not-a-real-secret",
    },
  },
});
