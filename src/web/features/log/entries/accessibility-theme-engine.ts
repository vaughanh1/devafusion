import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "accessibility-theme-engine",
  date: "2026-08-28",
  title:
    "Three-profile accessibility theme engine without losing static generation",
  summary:
    "Added Obsidian/Editorial/Tactical colour-and-scale profiles switchable from a footer control, backed by a strictly-necessary cookie pair and a pre-hydration inline script - not a server-side cookies() read, which would have forced every page off static generation.",
  tags: ["accessibility", "nextjs", "tailwind", "eslint", "gdpr"],
  decisions: [
    "Read the theme/scale cookies with an inline <script dangerouslySetInnerHTML> in <head> instead of next/headers cookies() in the root layout, following Next.js's own documented flash-prevention guide (node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md) - cookies() in the root layout is a Dynamic API read that opts the entire route tree out of static generation, which would have regressed every statically-generated page (log/[slug], projects/[slug], every plain page.tsx) for a problem the client-side script already solves with zero flash.",
    "Reuse every existing semantic token name (--background, --foreground, --surface, --surface-border, --accent, --accent-secondary, --accent-foreground, --muted) for all three profiles rather than inventing new token names, keeping exactly one Tailwind v4 token surface instead of two competing naming schemes.",
    "Declare the three [data-a11y-theme] blocks in globals.css after the existing @media (prefers-color-scheme: dark) block so an explicit user choice always wins over the OS default at equal CSS specificity, while leaving prefers-color-scheme as the zero-cookie fallback rather than replacing it.",
    "Verify every canvas/text and canvas/accent pair in all three profiles against the real WCAG relative-luminance formula before writing them into globals.css, rather than trusting a colour 'looking' high-contrast enough - this caught and fixed one failing pair (an initially-proposed #0070F3 accent on the Editorial canvas measured 4.22:1, failing even AA 4.5:1 as link text; replaced with #004C9E at 7.70:1 AAA) and required darkening the initial Obsidian/Editorial border colours, which measured below the 3:1 UI-border floor against their own canvas.",
    "Keep font/contrast scaling deferential to the browser by default (prefers-contrast, native browser zoom) - accessible-xl exists only as a narrow, documented override for fixed-size UI chrome that ignores text-only browser zoom, not a general-purpose replacement for OS/browser scaling.",
    "Leave locale-segment ([lang]) routing and any text-to-speech feature out of this change entirely - both are separate, larger architectural decisions that would touch every existing route, not a side effect of an accessibility-theme change.",
    "Enable eslint-plugin-jsx-a11y's own flat/recommended config in full, merging only its rules object into the existing eslint-config-next entry rather than re-declaring the plugin (which conflicts with the plugin registration eslint-config-next's core-web-vitals config already performs) - this closes the gap left by eslint-config-next's much narrower default a11y rule subset.",
  ],
  milestones: [
    "Added the Accessibility Theme Engine section to src/web/AGENTS.md and a consuming-only pointer to .templates/module.agent.md, plus a server-first/leaf-isolation rule and a hydration-safe-client-reads rule in the same file.",
    'Added [data-a11y-theme="obsidian|editorial|tactical"] and [data-a11y-scale="large|accessible-xl"] blocks to globals.css.',
    "Added components/theme/theme-flash-guard.tsx (a Server Component rendering the fixed, literal pre-hydration script) and components/theme/theme-selector.tsx (a 'use client' leaf using useSyncExternalStore, mirroring cookie-banner.tsx's pattern) and wired both into app/layout.tsx and site-footer.tsx.",
    "Documented the devafusion-a11y-theme/devafusion-a11y-scale cookies on /legal in the same style as the existing Google Analytics section, and corrected the 'What is not collected' paragraph to account for them.",
    "Enabled eslint-plugin-jsx-a11y's flat/recommended rule set in eslint.config.mjs.",
  ],
  validation: [
    "Computed WCAG relative-luminance contrast ratios by hand (Node one-liners, not the eyeballed AGENTS.md draft values) for all three profiles' canvas/text, canvas/accent, and border pairs before committing any colour to globals.css.",
    "npm run lint, npm run typecheck, and npm run build all passed clean.",
    "Confirmed via the build's route summary that every previously-static page (including log/[slug] and projects/[slug]'s SSG paths) remained static/SSG after adding the theme engine - only the pre-existing /api/health and experiments/[slug] dynamic routes stayed dynamic.",
    "Inspected the built static HTML directly and confirmed the literal flash-prevention script is present verbatim in <head>, and inspected the compiled CSS chunk directly and confirmed all three [data-a11y-theme] blocks and both [data-a11y-scale] rules compiled with the corrected colour values.",
  ],
  visibility: "public",
};
