import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "devafusion-brand-icons-and-manifest",
  date: "2026-09-12",
  title: "Devafusion brand mark, favicon and web manifest",
  summary:
    "Designed the Fortress Crossroads badge mark, shipped the full Next.js App Router icon/manifest/social-image file convention set, and surfaced the badge, wordmark and tagline in the site header and homepage hero so the brand identity is visible on every page, not just in browser chrome.",
  tags: ["design", "seo", "nextjs", "accessibility"],
  decisions: [
    "Iterated the badge design as a standalone HTML/inline-SVG preview file outside the repo before touching any Next.js code, so geometry and palette could be locked down first.",
    "Use Next.js's native file-convention metadata APIs (icon.svg, apple-icon.png, manifest.ts, opengraph-image.tsx, twitter-image.tsx) exclusively - no manual <link> tags and no manual metadata.icons/openGraph.images wiring, since Next.js auto-detects and auto-generates the <head> tags for these conventions.",
    "Generate the binary favicon.ico and apple-icon.png once locally from the finalized SVG via a throwaway script using the sharp dependency already present transitively, rather than adding a new image-processing dependency to package.json.",
    "Extract the badge + wordmark into a single BrandMark server component (components/brand/brand-mark.tsx) with compact/hero size variants, used in both SiteHeader and the homepage hero, instead of duplicating markup or keeping the header as plain text.",
    "Badge colours (red/gold/white) and the fusion/.net accent colours are fixed brand colours across every theme; the 'Deva' text and tagline follow --foreground/--muted so they always match the active a11y theme (obsidian/editorial/tactical) and prefers-color-scheme.",
    "Extract the shared OG/Twitter card JSX into components/brand/brand-social-image.tsx so the two ImageResponse routes stay in sync with a single source instead of duplicating markup.",
  ],
  milestones: [
    "Added app/icon.svg as the primary scalable favicon.",
    "Generated real multi-resolution app/favicon.ico (16/32/48px) and app/apple-icon.png (180x180), replacing the default Next.js icon.",
    "Added app/manifest.ts with brand name, theme_color and background_color matching the badge palette.",
    "Added app/opengraph-image.tsx and app/twitter-image.tsx generating a 1200x630 social card via next/og ImageResponse.",
    "Added the BrandMark component and wired it into SiteHeader (compact) and the homepage hero (large), with the SVG marked role=img and an aria-label for screen readers.",
    "Verified with npm run typecheck, npm run lint and a full npm run build, then inspected the prerendered homepage HTML to confirm the badge, wordmark, tagline and auto-generated <head> icon/OG tags all render correctly.",
  ],
  validation: ["npm run typecheck", "npm run lint", "npm run build"],
  visibility: "public",
};
