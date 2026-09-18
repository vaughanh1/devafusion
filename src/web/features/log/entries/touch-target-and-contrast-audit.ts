import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "touch-target-and-contrast-audit",
  date: "2026-09-18",
  title: "Touch targets/contrast audit, then AA-by-default with an AAA showcase opt-up and a force override",
  summary:
    "Checked as requested whether every button/interactive touchpoint hits 4.5:1 contrast and a 44x44 CSS px minimum touch target. Independently recomputed every color token pair in globals.css against the real WCAG relative-luminance formula - all passed 4.5:1. The touch-target audit found real gaps (PasswordField's reveal toggle, footer social icons/links, desktop nav links, several checkbox/radio labels) - fixed all of them via a new --touch-target-size CSS custom property, and added a real ThemeSelector toggle for it. That toggle initially defaulted to 44px (AAA) with an opt-down to 24px (AA); on request, reversed to the correct posture - WCAG AA is the widely accepted legal/regulatory baseline, so 24px is now the default and 44px (AAA) is an explicit opt-UP, a showcase choice, never the reverse. Also added a per-element data-touch-target-force=\"aaa\" escape hatch so a specific critical control (this codebase's example: the irreversible account-deletion button) can be pinned to the stricter bar regardless of a visitor's own site-wide preference.",
  tags: ["accessibility", "typescript"],
  decisions: [
    "Verified every globals.css color pair independently with a throwaway relative-luminance script (W3C's own formula) rather than trusting the file's existing inline comments.",
    "AA (24px) is the default, AAA (44px) is an explicit opt-UP - reversed from an earlier version of this same change that defaulted to AAA. AA is the standard actually being met by default; AAA is offered as a showcase of the stricter bar, not forced on every visitor.",
    "data-touch-target-force=\"aaa\" is a per-element escape hatch, applied via a plain CSS custom-property re-declaration on the element itself (no !important needed - a nearer cascade declaration always wins). Used sparingly: only for a control whose mis-tap consequence is severe/irreversible, not as a general substitute for respecting a visitor's own site-wide choice. Applied to delete-account-form.tsx's permanent-delete button as this codebase's concrete example (this project has no payment/donation flow to apply it to instead).",
    "/legal updated to describe the corrected default (24px baseline, 44px opt-up) and to name the one control that always meets the stricter bar regardless of the visitor's own setting.",
  ],
  milestones: [
    "app/globals.css: --touch-target-size now defaults to 1.5rem (24px, AA); html[data-a11y-target='aaa'] opts up to 2.75rem (44px, AAA); [data-touch-target-force='aaa'] is the new per-element override.",
    "components/theme/theme-selector.tsx + theme-flash-guard.tsx: AA/AAA toggle reordered (AA first) and its default flipped to 'aa'.",
    "app/account/delete-account-form.tsx: permanent-delete button carries data-touch-target-force=\"aaa\".",
    "tests-e2e/accessibility.spec.ts: 'touch target size @a11y' tests updated for the new default/opt-up direction, plus a new test proving the force-override attribute actually works via a real boundingBox() measurement.",
    "app/legal/page.tsx and src/web/AGENTS.md updated throughout to describe AA-by-default/AAA-opt-up/force-override, not the earlier AAA-by-default framing.",
  ],
  validation: [
    "npm run typecheck and npm run lint (eslint --max-warnings 0) both passed clean.",
    "npm run test:unit: 256 passed, 0 failed across 42 files.",
    "tests-e2e/accessibility.spec.ts's full suite (7 tests, including both touch-target tests) run against a real built app with correct fixture env vars: all passed.",
    "home-layout.visual.spec.ts (@visual) re-run against the pinned mcr.microsoft.com/playwright Docker image after the footer/nav layout changes - passed within maxDiffPixelRatio.",
    "Contrast ratios for every color-token pair across all 5 themes independently recomputed against the real WCAG relative-luminance formula - all measured above 4.5:1.",
  ],
  visibility: "public",
};
