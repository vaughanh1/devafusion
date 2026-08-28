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
    ? [["junit", { outputFile: "./tests-e2e-results/junit.xml" }], ["list"]]
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
  },
});
