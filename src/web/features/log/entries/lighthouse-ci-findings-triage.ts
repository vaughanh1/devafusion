import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "lighthouse-ci-findings-triage",
  date: "2026-09-17",
  title: "Triaging the first real Lighthouse HTML report findings",
  summary:
    "Now that LighthouseCI's reports are visible as pipeline tabs (see the preceding lighthouse-html-report-tabs entry), triaged the actual findings across all 3 audited pages. Fixed a real Lighthouse CI environment gap causing every page's errors-in-console audit to fail, and a legacy-javascript/unused-javascript regression from Next.js's default browserslist target. Confirmed the color-contrast finding is an already-handled false positive.",
  tags: ["ci", "accessibility", "performance", "tooling"],
  decisions: [
    "color-contrast flagging BrandMark's fusion/.net wordmark spans needed no fix - tests-e2e/accessibility.spec.ts already excludes [data-brand-wordmark] under WCAG 2.1 SC 1.4.3's named logo/brand-name exception. Lighthouse's own axe-core run has no equivalent per-element exclude mechanism, so it can't apply that same exception - an accepted, already-documented false positive, not a new defect.",
    "errors-in-console (every page, 500 on /api/auth/get-session) was a real gap in the LighthouseCI job's own fixture environment, not a live-site bug: AccountNav mounts authClient.useSession() site-wide via the header, which hits Better Auth's session endpoint, which queries Postgres via drizzleAdapter - and the job's build step only ever set NEXT_PUBLIC_TURNSTILE_SITE_KEY, no DATABASE_URL. Production always has a real DB. Fixed by adding a postgres:16 service container (Microsoft's own documented noncontainer-job pattern, reachable via localhost:5432) to the job, running the same CREATE EXTENSION citext workaround docs/adr/0013 already established for the live server, then npm run db:migrate before npx lhci autorun - proved end-to-end by booting the standalone server locally against a real Docker postgres:16 with the exact fixture env vars and confirming GET /api/auth/get-session returns 200 instead of 500.",
    "legacy-javascript/unused-javascript (home + log pages) traced to Next.js's default browserslist target being more conservative than this app's own supported-browser intent, transpiling/polyfilling Array.prototype.at/flat/flatMap, Object.fromEntries/hasOwn, and String.prototype.trimStart/trimEnd - all Baseline-supported in Next.js's own documented minimum target (Chrome/Edge 111+, Firefox 111+, Safari 16.4+). Fixed by adding that exact browserslist array to package.json rather than inventing a custom one, since Next.js's own docs present it as the deliberate floor, not an example to loosen further.",
    "largest-contentful-paint-element (home page) was left untouched - 84% of its LCP time is Render Delay, not network (TTFB only 16%), and investigating client-side hydration/render-blocking behavior is a materially larger, separately-scoped effort than this triage pass. performance stays warn-only per .lighthouserc.js's existing rationale; this is exactly the kind of pre-existing finding that comment anticipates being resolved in a dedicated follow-up, not silently ignored forever.",
  ],
  milestones: [
    "pipelines/ci/web.yml: LighthouseCI job gained a postgres:16 service container (top-level resources.containers, referenced via the job's services key), a 'Migrate Lighthouse fixture Postgres' step (citext extension + drizzle-kit migrate), and DATABASE_URL/BETTER_AUTH_SECRET/MFA_ENCRYPTION_KEY/TURNSTILE_SECRET_KEY fixture env vars on the lhci autorun step.",
    "src/web/package.json: added the browserslist array Next.js's own docs document as its default target, closing the legacy-javascript/unused-javascript gap.",
  ],
  validation: [
    "Pulled the actual embedded Lighthouse JSON out of all 3 exported HTML reports (grep for lh-audit--fail, not eyeballed) rather than trusting a summary - confirmed scores (Performance 88/99/95, Accessibility 96/96/96, Best Practices 96/96/96, SEO 100/100/100) and the exact 5 recurring findings before deciding what to fix.",
    "Ran npm run typecheck, npx eslint --max-warnings 0, npm run build, and npm run test:unit (17 files, 96 tests) - all pass clean after both fixes.",
    "Started a real Docker postgres:16 container locally, ran the exact CREATE EXTENSION citext + npm run db:migrate sequence the new pipeline step runs, booted .next/standalone/server.js with the exact fixture env vars the pipeline now sets, and confirmed GET /api/auth/get-session returns 200 (previously 500) and GET / still returns 200.",
    "npx lhci autorun itself could not be re-run end-to-end locally to regenerate a fresh HTML report - reproduced the same Windows-only chrome-launcher EPERM temp-directory-cleanup crash already documented in the a11y-lighthouse-audits log entry (confirmed independently via a direct npx lighthouse invocation, which hung identically). pipelines/ci/web.yml's LighthouseCI job runs on ubuntu-latest, where this class of bug does not reproduce - the DATABASE_URL fix was instead verified via the direct HTTP proof above, which exercises the exact same auth.ts/db/client.ts code path lhci's browser navigation would trigger.",
  ],
  visibility: "public",
};
