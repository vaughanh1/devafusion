import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "csp-dev-mode-unsafe-eval",
  date: "2026-09-18",
  title: "Dev-mode CSP was missing 'unsafe-eval', logging a console warning on every page load",
  summary:
    "npm run dev logged 'eval() is not supported in this environment' on every page load - script-src had no 'unsafe-eval', but Next.js/React's dev-mode Fast Refresh and debugging tooling genuinely calls eval(). Fixed by branching script-src on NODE_ENV: 'unsafe-eval' is granted only in development, never in production, verified directly against both a real npm run dev response header and a real production standalone build's response header.",
  tags: ["security", "typescript"],
  decisions: [
    "Scoped the fix to NODE_ENV === 'development' rather than granting 'unsafe-eval' unconditionally - a real production build never calls eval() at all, so granting the directive there would only widen the attack surface for zero functional benefit.",
    "Verified both branches against real running servers, not just by reading the code: npm run dev's actual response header included 'unsafe-eval'; a real next build + standalone server.js's response header did not.",
    "Added a direct unit test for next.config.ts's headers() function (previously entirely untested) asserting both branches explicitly, so a future change can't silently widen production's CSP while fixing a dev-only problem, or vice versa. Required adding a new vitest.config.mts include pattern (__tests__/**/*.test.{ts,tsx}) since next.config.ts is a root-level file with no existing app/components/features test-glob home.",
  ],
  milestones: [
    "next.config.ts's headers() now branches script-src on NODE_ENV, adding 'unsafe-eval' only in development.",
    "Added src/web/__tests__/next-config.test.ts covering both environments and the shared third-party origins.",
    "Extended vitest.config.mts's include/coverage globs to cover root-level config files.",
  ],
  validation: [
    "npm run typecheck and npm run lint (eslint --max-warnings 0) both passed clean.",
    "npm run test:unit: 221 passed, 0 failed across 36 files (up from 218/35).",
    "npm run build succeeded; confirmed via a real running standalone server that production's Content-Security-Policy response header contains no 'unsafe-eval'.",
    "Confirmed via a real running npm run dev server that development's Content-Security-Policy response header does contain 'unsafe-eval'.",
  ],
  visibility: "public",
};
