# Read theme cookies via a pre-hydration inline script, not next/headers cookies()

The accessibility theme engine (Obsidian/Editorial/Tactical profiles) reads
its `devafusion-a11y-theme`/`devafusion-a11y-scale` cookies with a literal,
Server-Component-rendered inline `<script>` in `<head>` that runs before
hydration, rather than calling `next/headers`'s `cookies()` in the root
layout — even though `cookies()` looks like the obvious, idiomatic Next.js
way to read a cookie server-side.

## Status
Accepted

## Considered Options
- `next/headers` `cookies()` read in the root layout — rejected. `cookies()`
  is a Dynamic API: calling it anywhere in the root layout opts the *entire*
  route tree out of static generation. This would have silently regressed
  every statically-generated page in the app (`log/[slug]`,
  `projects/[slug]`, every plain `page.tsx`) purely to solve a
  flash-of-wrong-theme problem that a client-side pre-hydration script
  already solves with zero flash and zero static-generation cost.

## Consequences
- Any future feature that seems to need a per-request cookie/header read in
  a layout or page must first check whether it can be solved client-side
  (as this was) before reaching for a Dynamic API — a Dynamic API call
  anywhere in a shared layout silently converts every page beneath it from
  static to dynamic rendering, with no build warning calling this out.
- The theme flash-guard script's exact contents are pinned to Next.js's own
  documented flash-prevention pattern (see
  `node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md`)
  and must not be extended with unrelated logic — it is deliberately kept
  minimal because it is the one sanctioned exception to the "no raw
  `<script>` tags" rule.
