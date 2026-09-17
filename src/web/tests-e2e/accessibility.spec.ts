import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// @a11y — same tagging discipline as @visual (sign-up.spec.ts,
// home-layout.visual.spec.ts): a distinct grep tag so this suite can
// be run in isolation without needing its own Playwright config or
// project. pipelines/ci/web.yml's E2ETests job runs `npx playwright
// test` with no --grep filter, so this spec already runs there
// automatically — confirmed by reading the pipeline directly, no
// pipeline YAML change needed for this file to execute in CI.
//
// axe-core is the same engine Lighthouse's own accessibility category
// uses (see the "axe-core" credit in .lighthouserc.js's audited
// runs), but running it directly via @axe-core/playwright here (a)
// covers /sign-up and /log-in, which .lighthouserc.js deliberately
// excludes from performance/SEO scope (Cloudflare Turnstile
// third-party noise — see that file's comment) but which still need
// structural a11y coverage, and (b) returns granular violations (per
// rule, per node) rather than Lighthouse's single rolled-up
// categories:accessibility score, giving a more actionable failure
// message.
//
// withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]) scopes the
// ruleset to the same WCAG 2.1 AA bar src/web/AGENTS.md's
// Accessibility Theme Engine section already holds every UI change
// to (SC 2.4.7/2.4.11 keyboard focus, SC 1.4.3/1.4.11 contrast, SC
// 4.1.2 name-role-value) — axe-core also ships "best-practice" rules
// outside that formal WCAG bar, which are deliberately not asserted
// here to keep this gate's scope aligned with the documented
// standard rather than axe's own opinions.
const auditedRoutes = ["/", "/projects", "/log", "/sign-up", "/log-in"];

test.describe("accessibility @a11y", () => {
  for (const route of auditedRoutes) {
    test(`${route} has no WCAG 2.1 AA violations`, async ({ page }) => {
      await page.goto(route);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        // WCAG 2.1 SC 1.4.3 (Contrast Minimum) has an explicit named
        // exception: "text that is part of a logo or brand name has
        // no minimum contrast requirement." BrandMark's "fusion"/
        // ".net" wordmark spans are exactly that - styled to match
        // the Madder Red/Roman Gold badge icon rendered right next to
        // them, not body copy - and axe-core's color-contrast rule
        // has no way to apply that exception itself (it only sees
        // text nodes, not brand-identity intent). A single hex
        // darkened enough to pass 4.5:1 on this page's white
        // background would also fail against the dark/obsidian/
        // tactical themes' near-black backgrounds (verified against
        // the real relative-luminance formula) - excluding the
        // wordmark, not recoloring it, is the fix the criterion
        // itself sanctions.
        .exclude("[data-brand-wordmark]")
        .analyze();

      expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
    });
  }
});
