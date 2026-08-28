import { expect, test } from "@playwright/test";

// @visual — selected by the pipelines/ci/web.yml VisualRegression job's
// --grep @visual filter, which runs only inside the pinned
// mcr.microsoft.com/playwright Docker image so this baseline is captured
// against the exact font stack the CI agent renders with (root
// AGENTS.md, Visual Regression Docker Enforcers). Never run this spec
// against the default chromium project on the bare hosted agent.
test.describe("home page @visual", () => {
  test("matches the committed screenshot baseline @visual", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveScreenshot("home-page.png", {
      fullPage: true,
      // The theme selector's data-a11y-theme cookie is unset for a
      // fresh context, so this baseline captures the default
      // prefers-color-scheme-driven appearance, not one of the three
      // named accessibility profiles.
      maxDiffPixelRatio: 0.02,
    });
  });
});
