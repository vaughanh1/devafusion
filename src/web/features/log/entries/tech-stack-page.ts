import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "tech-stack-page",
  date: "2026-09-20",
  title: "A public Tech Stack page - every real tool, one line each, then the real reasoning",
  summary:
    "Added /tech-stack: a single page listing every tool and Azure resource actually running in this project, each traced back to a real, dated ADR and engineering-log entry rather than asserted from memory. Deliberately dropped an initial referral-link/affiliate-tracking version of this page early in scoping - that would have required PECR-compliant opt-in consent gating identical to the existing GA4 consent-mode wiring, and there was no real referral programme to justify the added compliance surface, so the page ships with zero tracking and zero external monetisation links instead. Structured as a skimmable 'at a glance' verdict strip (one line per entry, anchor-linked) followed by the full ADR-style breakdown, after an early draft's dense wall of prose read as something a reviewer would bounce off rather than dig into.",
  tags: ["architecture", "documentation", "accessibility"],
  decisions: [
    "Every entry links to both its ADR (GitHub, docs/adr/) and its engineering-log entry (/log/<slug>) via one shared DigDeeper component - verified programmatically, not by eye, that all 14 log slugs and all 10 ADR file paths referenced on the page actually resolve to real files before treating the page as done. Caught and fixed one real mistake this way: gitleaks has no dedicated ADR, and an earlier draft had pointed its 'dig deeper' link at ADR-0001 anyway - fixed by making the ADR half of DigDeeper genuinely optional rather than inventing or misattributing a citation.",
    "No referral links, no third-party tracking cookies - the page was originally scoped with an affiliate-link/passive-income angle, but that would require the same PECR opt-in consent gating this project's GA4 integration already implements, and there was no real referral programme behind it to justify that added compliance surface for this slice. Simplified to a straightforward record of real tooling with zero monetisation before any code was written.",
    "Restructured the intro copy after direct feedback that it read as generic and self-deprecating ('deliberately unglamorous', 'nothing aspirational') rather than confident - rewritten to lead with the project's actual stance (a public proving ground held to a high standard, tools revisited whenever a better option earns its place) instead of hedging.",
  ],
  milestones: [
    "src/web/app/tech-stack/page.tsx (new): an 'at a glance' verdict strip (17 rows, anchor-linked) followed by full ADR-style Production Context / Technical Thesis breakdowns for 8 application tools and 9 Azure resource groups.",
    "Wired into src/web/components/navigation/main-navigation.tsx, src/web/app/sitemap.ts (+ sitemap.test.ts), and tests-e2e/accessibility.spec.ts's real axe-core WCAG 2.2 AA auditedRoutes list.",
  ],
  validation: [
    "npx tsc --noEmit and npx eslint --max-warnings 0 both pass clean.",
    "npm run test:unit: 288 passed, 0 failed, across 44 files.",
    "Ran the real axe-core WCAG 2.2 AA check (tests-e2e/accessibility.spec.ts) against a built standalone server for /tech-stack specifically - it surfaced only the same footer touch-target-spacing finding that fails identically against every other unmodified route in this sandbox (confirmed by running the same check against /, /log, and /projects), a known local font-rendering discrepancy from the CI-pinned Docker environment (docs/adr/0007), not a violation introduced by this page's own content.",
    "Confirmed every logSlug and ADR file path referenced on the page resolves to a real file via a direct filesystem check, not visual inspection.",
  ],
  visibility: "public",
};
