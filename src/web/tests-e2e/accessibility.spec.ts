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
// withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
// scopes the ruleset to WCAG 2.2 AA - the version this project
// actually targets (WCAG 3 remains a W3C Working Draft, not a
// Recommendation; not adopted here - see src/web/AGENTS.md). WCAG
// 2.2 is a strict superset of 2.0/2.1 (confirmed directly against
// the W3C spec: "Content that conforms to WCAG 2.2 also conforms to
// WCAG 2.0 and WCAG 2.1"), so the 2.0/2.1 tags are kept rather than
// dropped - there is no wcag22a tag in the installed axe-core
// version (confirmed by inspecting its own source: only wcag22aa
// exists), because WCAG 2.2 introduced no new Level A criteria, only
// AA and AAA ones. axe-core also ships "best-practice" rules outside
// the formal WCAG bar, deliberately not asserted here to keep this
// gate's scope aligned with the documented standard rather than
// axe's own opinions.
//
// The tag filter alone will not run `target-size`: confirmed
// directly against the installed axe-core's own rule definition that
// it ships with `enabled: false` - a disabled-by-default rule is not
// activated by tag filtering, it must be explicitly force-enabled via
// `.options({ rules: {...} })`. `.options()` and `.withTags()` are
// called in that order (not `.withRules()`, which the installed
// @axe-core/playwright's own source docs as "Cannot be used with
// withTags" - the two would silently overwrite each other's
// `runOnly` scope): `.options()` sets only `this.option.rules`,
// `.withTags()` afterward sets only `this.option.runOnly`, so calling
// both preserves each other's part of the same options object rather
// than clobbering it - confirmed directly against the installed
// package's source, not assumed from its public API surface alone.
//
// This is exactly the rule the earlier version of this file
// deliberately left disabled (its own 24px floor read as understating
// this project's then-44px-by-default bar) - now genuinely useful
// and non-misleading, since this project's own --touch-target-size
// default (globals.css) is 24px too, matching axe-core's check
// exactly. The 44px AAA opt-up and the data-touch-target-force
// escape hatch are still verified manually below (SC 2.5.5 has no
// axe-core rule at all, at any tag/options setting), not by this
// rule.
const auditedRoutes = ["/", "/projects", "/log", "/sign-up", "/log-in"];

test.describe("accessibility @a11y", () => {
  for (const route of auditedRoutes) {
    test(`${route} has no WCAG 2.2 AA violations`, async ({ page }) => {
      await page.goto(route);

      const results = await new AxeBuilder({ page })
        .options({ rules: { "target-size": { enabled: true } } })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
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

// This project's own 24px (WCAG 2.2 AA, SC 2.5.8) default and 44px
// (WCAG 2.2 AAA, SC 2.5.5) opt-up - see globals.css's
// --touch-target-size and theme-selector.tsx's AA/AAA toggle. AA is
// the baseline every visitor gets; AAA is only ever an explicit
// choice to go further, never the reverse. No automated tool
// (axe-core's target-size rule is disabled by default, wcag22aa-
// tagged only, and checks 24px even when enabled; Lighthouse has no
// target-size audit at all - both confirmed directly against source,
// documented in src/web/AGENTS.md) verifies this, so it is asserted
// here directly via a real rendered boundingBox() measurement, not
// delegated to axe-core/Lighthouse.
test.describe("touch target size @a11y", () => {
  test("defaults to 24px (AA) and the AAA toggle opts up to 44px", async ({
    page,
  }) => {
    await page.goto("/");

    const footerLink = page.getByRole("link", { name: "Privacy & cookies" });
    const defaultBox = await footerLink.boundingBox();
    expect(defaultBox!.height).toBeGreaterThanOrEqual(24);
    expect(defaultBox!.height).toBeLessThan(44);

    await page.evaluate(() => {
      document.documentElement.setAttribute("data-a11y-target", "aaa");
    });

    const aaaBox = await footerLink.boundingBox();
    expect(aaaBox!.height).toBeGreaterThanOrEqual(44);
  });

  // globals.css's [data-touch-target-force="aaa"] escape hatch -
  // an irreversible, destructive action (account deletion) must stay
  // pinned to the enhanced 44px target regardless of the visitor's
  // own site-wide AA/AAA preference. This is the one place on the
  // site the per-element override is actually applied
  // (delete-account-form.tsx) - asserted directly here rather than
  // just trusting the CSS rule exists, the same reasoning this
  // suite's own comment already applies to the site-wide toggle.
  test("the account-deletion button stays at 44px even when the site-wide setting is AA", async ({
    page,
  }) => {
    // /account is session-gated and this project's own
    // accessibility.spec.ts scope deliberately does not cover
    // authenticated routes (auditedRoutes above) - this test only
    // needs to prove the CSS override rule itself works, not
    // exercise a real logged-in session, so it runs against the
    // public home page and applies the exact same attribute the
    // real delete button carries (delete-account-form.tsx) to a
    // throwaway probe element.
    await page.goto("/");

    await page.evaluate(() => {
      document.documentElement.setAttribute("data-a11y-target", "aa");
      const probe = document.createElement("button");
      probe.id = "touch-target-force-probe";
      probe.setAttribute("data-touch-target-force", "aaa");
      probe.className = "min-h-[var(--touch-target-size)]";
      probe.textContent = "probe";
      document.body.appendChild(probe);
    });

    const probeBox = await page.locator("#touch-target-force-probe").boundingBox();
    expect(probeBox!.height).toBeGreaterThanOrEqual(44);
  });
});
