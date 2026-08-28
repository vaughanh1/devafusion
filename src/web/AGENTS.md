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

- **App Router only:** Focus on the App Router ecosystem. Maintain rigid architectural separation between React Server Components (RSC) and Client Components (`'use client'`). Do not over-nest client state.
- **Standalone Output Target:** Every modification to `next.config.ts` must preserve or enforce the `output: 'standalone'` setting. This is mandatory to ensure the application compiles to a self-contained, container-ready Node.js server.
- **No Raw Script Tags:** Never inject raw `<script>` tags for tracking into the HTML head. Frontend tracking must leverage native Next.js framework libraries (e.g., `@next/third-parties`) so client-side route transitions are captured without resetting the user session.
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

## App Router & File Layout Enforcement

- Directory names under `app/**` follow Next.js App Router conventions (`check-file/folder-naming-convention` with `NEXT_JS_APP_ROUTER_CASE` — kebab-case segments, with dynamic segments like `[slug]` permitted).
- Directory names under `components/**` and `features/**` are `kebab-case` (`check-file/folder-naming-convention` with `KEBAB_CASE`).
- Filenames under `components/**` and `features/**` are `kebab-case` (`check-file/filename-naming-convention` with `KEBAB_CASE`); any future `hooks/*` files are `camelCase`.
- `npm run lint` runs `eslint --max-warnings 0` — the ESLint CLI directly, since Next.js 16 removed the `next lint` command. Zero warnings are tolerated; this is a build-breaking gate, not advisory.
