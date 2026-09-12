import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "devafusion-brand-mark-stroke-width-sync",
  date: "2026-09-12",
  title: "Sync brand mark stroke-width with updated icon.svg",
  summary:
    "The horizontal white crossroads line in app/icon.svg was tuned to a slightly thinner stroke-width (2.5 to 2.0). Propagated that same value to every other place the badge geometry is duplicated so all rendered instances stay visually identical.",
  tags: ["design", "nextjs"],
  decisions: [
    "Treat app/icon.svg as the single source of truth for the badge geometry - regenerate the derived favicon.ico/apple-icon.png binaries and update the two React component copies (BrandMark, BrandSocialImage) from it rather than editing each independently.",
  ],
  milestones: [
    "Regenerated app/favicon.ico and app/apple-icon.png from the updated SVG via the throwaway sharp-based generation script.",
    "Updated the horizontal line stroke-width in components/brand/brand-mark.tsx and components/brand/brand-social-image.tsx to match.",
    "Confirmed via the pinned Docker Playwright image that the change is within the existing visual regression baseline's tolerance - no baseline update required.",
  ],
  validation: ["npm run typecheck", "npm run lint", "npm run build"],
  visibility: "public",
};
