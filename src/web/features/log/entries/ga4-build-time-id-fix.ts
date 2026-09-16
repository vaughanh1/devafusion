import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "ga4-build-time-id-fix",
  date: "2026-09-16",
  title: "GA4 measurement ID has the same build-time NEXT_PUBLIC_* inlining bug as the Turnstile sitekey",
  summary:
    "A live '@next/third-parties: GA has not been initialized' console warning traced back to the exact same root cause as the previously-fixed Turnstile sitekey bug: NEXT_PUBLIC_GA_ID is inlined into the compiled bundle at next build time, not read at App Service runtime, and google-analytics.tsx having no 'use client' directive does not exempt it from that. CI's Build stage never fetched this value from Key Vault before running next build, so the live artifact had it baked in as empty.",
  tags: ["bugfix", "analytics", "ci-cd"],
  decisions: [
    "Confirmed empirically, not from documentation, that Next.js's NEXT_PUBLIC_* inlining applies to both the server and client compiler graphs with no isClient guard: node_modules/next/dist/build/define-env.js's getDefineEnv() unconditionally spreads every NEXT_PUBLIC_* variable into the shared defineEnv object before any client/server branching happens. Verified directly: built locally with NEXT_PUBLIC_GA_ID unset and grepped every .next/server chunk for any trace of it (none found), then rebuilt with a dummy value set as a real shell environment variable and found that literal string inlined into a server chunk.",
    "This retroactively corrects an assumption made in the earlier ga4-analytics-with-consent-mode log entry, which claimed a Server Component's runtime app_settings value would be sufficient for this variable - that claim was never actually tested against a real build, and google-analytics.tsx running on the server does not change which compiler graph next build inlines NEXT_PUBLIC_* into.",
    "Fixed by extending the AzureKeyVault@2 step already added for the Turnstile sitekey bug (pipelines/ci/web.yml's BuildWeb job) to also fetch google-analytics-ga4-devafusion, and setting NEXT_PUBLIC_GA_ID on that job's build script step alongside the existing sitekey variable - reusing the same task rather than adding a second one, since SecretsFilter accepts a comma-separated list.",
    "Left NEXT_PUBLIC_GA_ID unset on the E2ETests job's build step deliberately: no real or dummy GA4 traffic should originate from a CI-run Playwright suite, and google-analytics.tsx's own falsy check already treats an unset value as 'analytics disabled' by design. VisualRegression's build step already left it unset by default, so needed no change.",
  ],
  milestones: [
    "pipelines/ci/web.yml: extended the existing AzureKeyVault@2 step's SecretsFilter to include google-analytics-ga4-devafusion, and added NEXT_PUBLIC_GA_ID to BuildWeb's build step env block.",
    "docs/adr/0014 updated: 'Two live-deployment bugs' section renamed to 'Three live-deployment bugs found post-merge and fixed', with a third bullet documenting this root cause and its empirical verification.",
  ],
  validation: [
    "Reproduced locally: built with NEXT_PUBLIC_GA_ID unset and confirmed no trace of it in any compiled .next/server chunk; rebuilt with a dummy value as a real shell environment variable and confirmed that literal value appeared inlined in a server chunk.",
    "npm run typecheck and npm run lint both pass clean.",
    "This fix could not be validated against a real Azure DevOps pipeline run before being documented, since that requires a live CI trigger - the local build-output comparison is the strongest available proof short of that.",
  ],
  visibility: "public",
};
