import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "header-reflow-accessible-xl-fix",
  date: "2026-10-09",
  title: "Fixed the header overflowing/reflowing incorrectly on a narrow mobile viewport at Accessible XL text size",
  summary:
    "SiteHeader's brand wordmark + Menu + Log in row had no flex-wrap. Reported live: switching to the Accessible XL text-size opt-up (globals.css's html[data-a11y-scale=\"accessible-xl\"], 125% root font-size) on a narrow mobile viewport grew the row's combined width past the screen, forcing horizontal scroll and squashing the Log in button's own text onto two lines (\"Log\" / \"in\") rather than reflowing the row itself - a real WCAG 2.2 SC 1.4.10 (Reflow, AA) violation, not just a cosmetic one. Added flex-wrap to the header row and whitespace-nowrap to every header control's own label so a control's text is never the thing that breaks - the row wraps onto a second line instead.",
  tags: ["accessibility", "wcag", "ux", "mobile"],
  decisions: [
    "flex-wrap on the header row, not a fixed/shrunk layout at narrow widths - this keeps every control at its full, legible size regardless of viewport width or text-size opt-up, matching the same reflow-over-shrink approach already used for ThemeSelector's panel in the prior mobile-accessibility-panel-overflow-fix slice.",
    "whitespace-nowrap added to every header control's own label (Log in, Account, Log out, Menu), not only the one that was observed breaking - the same growing-font-size stress applies equally to all of them, and the fix should close the whole class of bug, not just the one instance that happened to be screenshotted.",
    "min-w-0 added to the brand Link wrapper so BrandMark can report a shrinkable flex basis rather than forcing its intrinsic width - without it, a flex-wrap row can still refuse to wrap an item that insists on its full intrinsic size.",
    "New e2e regression test (tests-e2e/accessibility.spec.ts) asserts against MainNavigation's always-rendered 'Menu' button rather than AccountNav's session-gated 'Log in' link, since AccountNav resolves its session client-side via authClient.useSession() and never settles out of its loading placeholder in any environment with no reachable database - the reflow being tested is structural/CSS, not session-dependent, so the assertion target was chosen to avoid that unrelated dependency entirely.",
  ],
  milestones: [
    "src/web/components/layout/site-header.tsx: header row gained flex-wrap and py-3 (so wrapped content isn't flush against the border); brand Link wrapper gained min-w-0.",
    "src/web/components/navigation/account-nav.tsx: whitespace-nowrap added to the Log in, Account, and Log out controls.",
    "src/web/components/navigation/main-navigation.tsx: whitespace-nowrap added to the mobile Menu toggle.",
    "src/web/tests-e2e/accessibility.spec.ts: new 'header reflow at Accessible XL text size @a11y' describe block asserting document.documentElement.scrollWidth never exceeds clientWidth at a 375px viewport with data-a11y-scale=\"accessible-xl\" set, plus a boundingBox() check that the Menu button's own label never wraps.",
  ],
  validation: [
    "npm run test:unit: 288 passed, 0 failed across 44 files (no behavioural change to any unit-tested logic).",
    "New Playwright test (header reflow @a11y) passes against a real built app.",
    "Confirmed via git stash that the existing 8 accessibility.spec.ts failures encountered in this same local ad hoc npm run build/start loop (target-size/target-offset axe findings, and the two touch-target-size boundingBox assertions) reproduce identically on unmodified develop with no code changes - pre-existing to this local Windows dev-loop environment, not introduced by this change. The real CI pipeline's E2ETests job runs these specs cleanly against its own hosted agent per pipelines/ci/web.yml; this PR's own CI run is the authoritative check, not this local reproduction.",
  ],
  visibility: "public",
};
