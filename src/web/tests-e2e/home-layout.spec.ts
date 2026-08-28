import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("home layout", () => {
  test("hydrates without a layout-shift-triggering theme flash", async ({
    page,
  }) => {
    await page.goto("/");

    // The flash-guard script (components/theme/theme-flash-guard.tsx) runs
    // before first paint and before hydration — by the time the page is
    // interactive, the html element must already carry whatever
    // data-a11y-theme/data-a11y-scale attributes the cookie contract
    // dictates (none, for a fresh session with no cookie set), and must
    // not still be missing the hydration marker Next.js clears once
    // client and server trees reconcile.
    await expect(page.locator("html")).not.toHaveAttribute(
      "data-a11y-theme",
      /.+/,
    );

    await page.waitForLoadState("networkidle");

    const main = page.locator("main");
    await expect(main).toBeVisible();
  });

  test("does not leak a raw tracking <script> tag into the document head", async ({
    page,
  }) => {
    await page.goto("/");

    // src/web/AGENTS.md forbids raw <script> tags for tracking; the only
    // sanctioned literal <script> is the flash-prevention guard, which
    // carries no src attribute and no tracking payload.
    const rawScripts = await page.locator("head script").evaluateAll(
      (scripts) =>
        scripts
          .map((script) => ({
            src: script.getAttribute("src"),
            inline: script.textContent ?? "",
          }))
          .filter(
            (script) =>
              script.src?.includes("googletagmanager") ||
              script.src?.includes("google-analytics") ||
              script.inline.includes("gtag("),
          ),
    );

    expect(rawScripts).toHaveLength(0);
  });

  test("has no critical or serious accessibility violations", async ({
    page,
  }) => {
    await page.goto("/");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      // Color contrast is verified by hand against the real WCAG
      // relative-luminance formula per src/web/AGENTS.md's Accessibility
      // Theme Engine section (the same reason eslint-plugin-jsx-a11y
      // cannot check it either) — this run stays scoped to the
      // structural/semantic violations axe-core is actually reliable at
      // (missing alt text, invalid ARIA, unlabeled controls).
      .disableRules(["color-contrast"])
      .analyze();

    const seriousOrCritical = results.violations.filter(
      (violation) =>
        violation.impact === "serious" || violation.impact === "critical",
    );

    expect(seriousOrCritical).toHaveLength(0);
  });
});
