<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Web Application Spoke

Governs `src/web/**`. Universal rules (Persona, Git discipline,
Pre-Flight Gate, PR pipeline) live in the root [`AGENTS.md`](../../AGENTS.md);
this file holds the Next.js/TypeScript/Tailwind/Routing rules specific
to this application.

## Next.js & React Boundaries

- **App Router only:** Focus on the App Router ecosystem.
- **Server-First, Leaf-Isolated Client Boundaries:** The codebase is React Server Component (RSC) first by default. `'use client'` is a deliberate performance cost, not a default — never mark an entire route file or a structural layout container as a Client Component; isolate interactivity to the smallest leaf node that needs it (e.g. a single `<ThemeSelector />` button group, not the section that contains it — see `theme-selector.tsx` and the Accessibility Theme Engine section below). Do not over-nest client state. Never execute a database query, translation/parsing logic, or non-trivial array filtering inside a `'use client'` boundary — that work belongs on the server.
- **Hydration-Safe Client Reads:** A client component reading browser-only state (storage, cookies) must not introduce a visible flash or a hydration mismatch. Prefer `useSyncExternalStore` (see `cookie-banner.tsx`) or a lazy `useState` initializer that reads the same source a pre-hydration inline script already wrote to the DOM (see the Accessibility Theme Engine section). A plain mount-guard `useEffect` is a fallback only, since it re-renders after first paint and produces a visible flash.
- **Standalone Output Target:** Every modification to `next.config.ts` must preserve or enforce the `output: 'standalone'` setting. This is mandatory to ensure the application compiles to a self-contained, container-ready Node.js server.
- **No Raw Script Tags:** Never inject raw `<script>` tags for tracking into the HTML head. Frontend tracking must leverage native Next.js framework libraries (e.g., `@next/third-parties`) so client-side route transitions are captured without resetting the user session. The one sanctioned exception is the fixed, literal flash-prevention script described in the Accessibility Theme Engine section — it exists specifically because it must run before any framework script loads.
- **Explicit Server Error Handling:** All Next.js Server Components and server actions that perform data fetching or mutations must handle errors explicitly using `try/catch` blocks. Do not let unhandled promise rejections propagate; they can escape server telemetry hooks in a containerized environment.

## Environment Variables

- **Server-side variables** (no prefix, e.g. `DATABASE_URL`) stay in the Node.js process and are never bundled into browser JavaScript. A check for `undefined` before use is sufficient.
- **Client-side variables** (prefixed `NEXT_PUBLIC_`, e.g. `NEXT_PUBLIC_GA_ID`) are the deliberate exception: Next.js inlines their value as a literal string directly into the browser bundle at build time, making them visible to anyone who views page source. Only use this prefix for values that are safe to be fully public (e.g. a GA4 Measurement ID, which the analytics script itself exposes in a network request anyway) — never for secrets.
- Next.js does **not** fail the build if a `NEXT_PUBLIC_` variable is unset; it silently inlines `undefined`. There is no build-time safety net, so code must check for a falsy value at runtime (e.g. `if (!process.env.NEXT_PUBLIC_MY_VAR)`) and handle the missing case itself.
- If a variable is missing or empty during local development (`process.env.NODE_ENV !== 'production'`), log a descriptive `console.warn` and gracefully disable the corresponding feature. Do not crash the application.

## TypeScript & Tailwind Code Standards

- **Strict Type Safety:** The `any` type is forbidden. All props, functions, API payloads, and state objects must have explicit `interface` or `type` definitions. Leverage TypeScript utility types (`Record`, `Partial`, `Pick`) to maintain clean and reusable definitions.
- **Clean Component Structure:** Always write components as functional components. Type definitions for props and state must be declared as a separate `interface` or `type` block *above* the component function, never inline.
- **Predictable Tailwind Styling:** Apply utility classes directly in the `className` attribute. For dynamic classes, use the `clsx` or `tailwind-merge` libraries to prevent style collisions and ensure predictability. Raw string concatenation for dynamic classes is forbidden. All styling must adhere to the existing design tokens in the Tailwind theme (see `src/web/app/globals.css`).
- **File Naming:** Component and feature filenames use `kebab-case` (e.g. `site-header.tsx`), matching this project's existing files and the `eslint-config-next` default; the exported symbol itself uses `PascalCase` (e.g. `export function SiteHeader()`). This is enforced by `check-file/filename-naming-convention` in `eslint.config.mjs` — see the App Router & File Layout Enforcement section below.

## Routing, Metadata & SEO Standards

- **Strict Metadata Compilation Guard:** Every page component (`page.tsx`) must strictly implement the typed `Metadata` interface from `next`. A missing `title` or `description` in the metadata configuration is treated as a critical code violation.
- **Static Link Verification:** All internal links must use the framework-native `<Link>` component. Never use raw `<a>` tags for internal paths. Before generating a `<Link href="...">` or `router.push()` call, verify the target route actually exists in the app's file-system route tree.
- **Framework-Level Route Verification:** Use Next.js **Typed Routes** (`typedRoutes: true` — this is a stable, top-level `next.config.ts` key as of Next.js 15+; it is not nested under `experimental`). This forces TypeScript to throw an explicit compilation error during `npm run build` if an invalid or dead path string is passed to any `<Link href="...">` or `router.push()` call.
- **Automated SEO Integration Audits:** Every time a route layout is modified, verify that its viewport and OpenGraph (OG) configuration matches the unified global metadata theme, so social preview cards do not silently break.

## Accessibility Theme Engine

- **Three fixed profiles, zero new tokens:** "Obsidian" (dark), "Editorial" (light, high-readability), and "Tactical" (WCAG AAA monochrome) are three value sets for the *existing* semantic tokens (`--background`, `--foreground`, `--surface`, `--surface-border`, `--accent`, `--accent-secondary`, `--accent-foreground`, `--muted`) — never introduce parallel token names for the same concept.
- **Selector, not server read:** Profiles are switched via a `data-a11y-theme` attribute on `<html>`, declared in `globals.css` *after* the existing `@media (prefers-color-scheme: dark)` block so an explicit choice always wins over the OS default (equal-specificity selectors resolve by source order). Never read the theme cookie with `next/headers` `cookies()` in a Server Component — reading a Dynamic API in the root layout opts the entire route tree out of static generation, which regresses every statically-generated page (`log/[slug]`, `projects/[slug]`, etc.) for no benefit the client-side approach doesn't already provide. Read the cookie client-side via an inline `<script dangerouslySetInnerHTML>` in `<head>`, following the framework's own documented flash-prevention pattern (`node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md`). This is the one sanctioned use of `dangerouslySetInnerHTML` in this codebase, and only for this fixed, literal script body — it must never be built from interpolated or user-controlled input.
- **OS default first:** With no cookie set, `prefers-color-scheme` continues to govern light/dark exactly as it does today. The theme engine is an explicit opt-in override, not a replacement for honoring browser/OS signals.
- **WCAG AAA is a verified property, not an aspiration:** every canvas/text and canvas/accent pair shipped in a profile must be checked against the real WCAG relative-luminance formula (7:1 body text, 4.5:1 headers, 3:1 UI borders/focus states) before merging — do not ship a color pair on the strength of it "looking" high-contrast. `--muted` (used for regular readable body copy across this site, e.g. descriptions, log entries) is held to the 7:1 body-text bar, not the lighter 4.5:1 bar reserved for large headers.
- **Cookie contract:** `devafusion-a11y-theme` (`obsidian` | `editorial` | `tactical`) and `devafusion-a11y-scale` (`normal` | `large` | `accessible-xl`), named consistently with the existing `devafusion-cookie-consent` cookie. Classified "Strictly Necessary" (a functional preference, not tracking or profiling) and documented on `/legal` in the same style as the existing Google Analytics cookie section. A database-backed preference store (keyed to a user account) is a legitimate future upgrade once this project has an identity/auth system — until then, an anonymous cookie is the only mechanism that makes sense, since there is no account to key a database row on.
- **Font/contrast scaling defers to the browser first:** do not build an app-level font-zoom control duplicating native browser zoom and the `prefers-contrast`/`prefers-reduced-motion` media queries the browser already exposes for free. `accessible-xl` exists as a documented, narrow override for cases native browser zoom doesn't cover (e.g. fixed-size UI chrome that ignores text-only zoom) — it is not a general-purpose replacement for OS/browser scaling.
- **Leaf-isolated control, not a layout-tree client boundary:** `<ThemeSelector />` is a `'use client'` leaf under `components/`. It sets the `data-a11y-theme` attribute on `document.documentElement` and writes `document.cookie` directly in its click handler — no `router.refresh()`, no server round-trip, since the value is never read server-side. Any local "which option is active" highlight state uses a lazy `useState` initializer reading the same cookie the inline script reads, mirroring the `useSyncExternalStore` pattern already used in `cookie-banner.tsx` — never a mount-guard `useEffect` that would flash the wrong state on first paint.
- **Color is never the sole signal:** semantic alerts (success/warning/error) pair color with iconography or a typographic change (weight, underline) — never color alone, across every theme profile including Tactical.
- **Locale routing (`[lang]` segments) and any audio/TTS feature are explicitly out of scope for this theme engine.** They are a separate, larger routing decision and must not be assumed or partially implemented as a side effect of accessibility-theme work.

## App Router & File Layout Enforcement

- Directory names under `app/**` follow Next.js App Router conventions (`check-file/folder-naming-convention` with `NEXT_JS_APP_ROUTER_CASE` — kebab-case segments, with dynamic segments like `[slug]` permitted).
- Directory names under `components/**` and `features/**` are `kebab-case` (`check-file/folder-naming-convention` with `KEBAB_CASE`).
- Filenames under `components/**` and `features/**` are `kebab-case` (`check-file/filename-naming-convention` with `KEBAB_CASE`); any future `hooks/*` files are `camelCase`.
- `npm run lint` runs `eslint --max-warnings 0` — the ESLint CLI directly, since Next.js 16 removed the `next lint` command. Zero warnings are tolerated; this is a build-breaking gate, not advisory.
- `eslint-plugin-jsx-a11y`'s `flat/recommended` config is enabled in full (not just the narrow subset `eslint-config-next` bundles by default) — every rule it flags fails the zero-warning lint gate above. This catches structural accessibility mistakes (missing `alt`, invalid ARIA, unlabeled controls) at commit time; it cannot check color contrast ratios, which are verified by hand against the WCAG formula per the Accessibility Theme Engine section, not by ESLint.
