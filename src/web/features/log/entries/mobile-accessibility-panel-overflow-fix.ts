import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "mobile-accessibility-panel-overflow-fix",
  date: "2026-10-09",
  title: "Fixed the footer Accessibility panel overflowing off-screen on mobile viewports",
  summary:
    "The footer's 'Accessibility' disclosure panel (ThemeSelector) used a plain w-max width with no viewport cap, anchored absolute right-0 against its trigger button. On a narrow mobile viewport (reported on a Pixel 9, 412px wide) the panel grew wider than the screen and overflowed off both edges, with button labels clipped and no way to scroll it back into view - the control was effectively unusable on mobile. Capped the panel's width to the viewport, added a max-height with vertical scroll as a safety net, and let each control row wrap instead of forcing one unbreakable line.",
  tags: ["accessibility", "ux", "mobile"],
  decisions: [
    "Capped the panel to w-[calc(100vw-2rem)] max-w-sm rather than a fixed px width - this keeps the existing desktop sizing (max-w-sm is close to the prior effective width there) while guaranteeing the panel never exceeds the viewport on any screen size, without needing a separate mobile-only breakpoint rule.",
    "Added max-h-[70vh] overflow-y-auto as a safety net alongside the width cap, rather than relying on width alone - a short mobile viewport (landscape, or a visitor with the AAA 44px touch-target/accessible-xl text-size opt-ups both active) could still make the stacked content taller than the screen even once it's no longer too wide.",
    "Added flex-wrap to each control row (colour theme, text size, touch-target size) so buttons reflow onto a second line inside the now width-capped panel instead of staying forced into one row that would otherwise re-introduce the same overflow the width cap was meant to fix.",
  ],
  milestones: [
    "src/web/components/theme/theme-selector.tsx: #a11y-panel's className changed from w-max to w-[calc(100vw-2rem)] max-w-sm max-h-[70vh] overflow-y-auto; flex-wrap added to the colour-theme, text-size, and touch-target-size control rows.",
  ],
  validation: [
    "npm run test:unit -- theme-selector: all 14 existing tests pass unchanged (no behavioural change, only layout classes).",
    "Confirmed the panel is rendered with className=\"hidden\" by default (isOpen=false), so this change has zero effect on home-layout.visual.spec.ts's full-page baseline screenshot of the closed default state - not re-run against the pinned Playwright Docker image since no visible pixels change in that state.",
  ],
  visibility: "public",
};
