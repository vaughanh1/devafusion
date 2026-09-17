import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "a11y-lighthouse-audits",
  date: "2026-09-17",
  title: "Automated Lighthouse CI and axe-core accessibility audits",
  summary:
    "Added two independent automated audit gates that previously only existed as manual review: Lighthouse CI (accessibility/best-practices/SEO/performance category scores against /, /projects, /log) and an axe-core Playwright spec (WCAG 2.1 AA violation checks against those three plus /sign-up and /log-in). Both immediately found real, pre-existing defects rather than passing cleanly on the first run - two color-contrast violations locally, and a site-wide rel=canonical inheritance bug surfaced by cross-checking against a live production Lighthouse run - proving their worth before being merged.",
  tags: ["accessibility", "testing", "ci"],
  decisions: [
    "Scoped .lighthouserc.js to /, /projects, /log only - excluded /sign-up and /log-in because both mount TurnstileWidget, whose third-party challenges.cloudflare.com script introduces network-variable noise that would pollute performance scoring and reflects Cloudflare's performance, not this app's. Those two routes still get full structural accessibility coverage from the separate axe-core spec, which has no such limitation.",
    "Set categories:performance to warn, not error, in .lighthouserc.js - the live site already has known, untriaged performance findings; hard-gating today would make every PR red from the first run regardless of whether it touches performance, training reviewers to ignore the gate. accessibility/best-practices/SEO stay error - near-deterministic structural checks with no legitimate reason to regress. Documented in src/web/AGENTS.md as an explicit, tracked decision that performance must be promoted to error later, not silently left as warn forever.",
    "Ran the new accessibility.spec.ts locally before deciding anything about scope or thresholds, per this project's own empirical-verification discipline - it failed on all 5 routes with two distinct real color-contrast violations, not a flaky or config issue (confirmed by rerunning after each fix).",
    "Fixed the interactive-control violation (the cookie banner's Accept button, using --accent/--accent-foreground) at the token source in globals.css, darkening the default theme's --accent from a value that measured 3.68:1 against white to one that measures ~4.7:1, computed against the real WCAG relative-luminance formula rather than eyeballed. Same cyan hue family, just deep enough to clear the 4.5:1 text bar in both directions (contrast ratio is symmetric).",
    "Did not recolor the BrandMark wordmark's Madder Red/Roman Gold text for the second violation - WCAG 2.1 SC 1.4.3 has an explicit named exception for logo/brand-name text, and a single hex darkened enough to pass 4.5:1 against this page's white background would also fail against the dark/obsidian/tactical themes' near-black backgrounds. Added a data-brand-wordmark attribute and excluded it from the axe scan instead, with the WCAG citation inline in both the spec and the component - the exception the criterion itself sanctions, not a convenience suppression.",
    "Verified the --accent change against the committed home-page.png visual baseline using the pinned mcr.microsoft.com/playwright Docker image (root AGENTS.md's Visual Regression Docker Enforcers) rather than assuming a small color change was fine - it passed within the existing 2% maxDiffPixelRatio, so no baseline update was needed.",
    "Abandoned repeated attempts to get a full local lhci autorun pass on Windows after reproducing a Windows-only chrome-launcher fs.rmSync EPERM crash during post-audit temp-directory cleanup twice, on a clean reinstalled node_modules, unrelated to any install corruption. The audit itself completes and generates real category data before the crash; pipelines/ci/web.yml's LighthouseCI job runs on ubuntu-latest, where this class of bug does not reproduce - config correctness was instead verified via the healthcheck, a real (if incomplete) audit run's output, and the separately-working axe-core spec run on the same routes.",
    "Ran a real Lighthouse audit against the live production /log page (pre-dating this branch's fixes) to cross-check the local findings, surfacing a third real defect this branch's own audits hadn't caught yet: SEO 92/100, flagging 'Document does not have a valid rel=canonical - points to the domain's root URL instead of an equivalent page of content'. Traced to layout.tsx's root alternates.canonical: '/' being silently inherited by every page that didn't set its own (Next.js metadata inheritance) - about/page.tsx and contact/page.tsx already set theirs explicitly, but log, log/[slug], projects, projects/[slug], experiments, experiments/[slug], and legal did not. Fixed all seven at the source rather than only /log, since the same inheritance gap affected every one of them identically.",
  ],
  milestones: [
    "src/web/.lighthouserc.js (new): Lighthouse CI config - 3 runs each on /, /projects, /log; filesystem upload target (not temporary-public-storage, to avoid exposing audit data via a public URL).",
    "src/web/tests-e2e/accessibility.spec.ts (new, @a11y tag): axe-core WCAG 2.1 AA check against /, /projects, /log, /sign-up, /log-in.",
    "pipelines/ci/web.yml: new isolated LighthouseCI job in the Test stage (dependsOn: [], same pattern as E2ETests/VisualRegression), publishing a lighthouse-reports pipeline artifact on every run via PublishPipelineArtifact@1 (condition: always()).",
    "src/web/app/globals.css: default theme's --accent darkened from a 3.68:1-against-white value to ~4.7:1.",
    "src/web/components/brand/brand-mark.tsx: added data-brand-wordmark, cited to WCAG 2.1 SC 1.4.3's logo exception.",
    "src/web/package.json: added @axe-core/playwright and @lhci/cli as devDependencies; new lighthouse script (lhci autorun).",
    "src/web/AGENTS.md and src/web/__tests__/AGENTS.md: new sections documenting the audit scope, thresholds, exclusion policy, and @a11y tag conventions.",
    "app/log/page.tsx, app/log/[slug]/page.tsx, app/projects/page.tsx, app/projects/[slug]/page.tsx, app/experiments/page.tsx, app/experiments/[slug]/page.tsx, app/legal/page.tsx: added explicit alternates.canonical, matching the pattern already used by about/page.tsx and contact/page.tsx.",
  ],
  validation: [
    "npm run lint, npm run typecheck, npm run build all pass clean.",
    "npm run test:unit - 96/96 tests pass (no unit-test-level changes in this slice; confirms the globals.css/brand-mark.tsx edits introduced no regression).",
    "npx playwright test --grep @a11y - all 5 routes pass with zero WCAG 2.1 AA violations after both fixes (failed on all 5 before, with the two contrast violations described above).",
    "npx playwright test --grep @visual, run against the pinned mcr.microsoft.com/playwright Docker image - passes within the existing 2% maxDiffPixelRatio after the --accent change; no baseline update needed.",
    "lhci autorun's healthcheck passes and a real audit run executes and reaches result generation on http://127.0.0.1:3000/ (is-on-https, viewport, and other category audits computed with real scores) before hitting a Windows-only chrome-launcher cleanup crash unrelated to this app - full end-to-end lhci autorun pass is left to the ubuntu-latest CI agent, where that crash class does not reproduce.",
    "Verified the canonical fix directly against the built standalone server's rendered HTML for /log - the rel=canonical link tag changed from https://devafusion.net/ to https://devafusion.net/log.",
  ],
  visibility: "public",
};
