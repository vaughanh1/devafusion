import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "turnstile-build-time-key-and-csp-fix",
  date: "2026-09-16",
  title: "Fixed two live bugs from the auth-hardening deploy: Turnstile build-time key, CSP blocking GA4",
  summary:
    "The previous slice's Turnstile widget and CSP header both shipped broken on the live site, confirmed directly from the browser console: sign-up/log-in were unusable because the widget never rendered, and GA4 analytics were silently blocked. Both root causes were confirmed empirically by inspecting real compiled build output and real console errors, not assumed from documentation.",
  tags: ["bugfix", "security", "ci-cd"],
  decisions: [
    "NEXT_PUBLIC_TURNSTILE_SITE_KEY is inlined into the client bundle at next build time, not read at App Service runtime - Terraform's app_settings value (correct for NEXT_PUBLIC_GA_ID, which is read inside a Server Component) does nothing for TurnstileWidget, a Client Component. Confirmed empirically rather than from documentation alone: inspected the actual compiled Turbopack chunk with the value absent (compiles to a live process.env property lookup behind an if (!sitekey) guard, which fires the exact 'cannot render' console error seen live) versus present as a real shell env var at build time (compiles to the literal string, guard branch dead-code-eliminated).",
    "Also empirically confirmed that .env.local alone did not reliably reproduce build-time inlining in this Next.js 16.3.5 + Turbopack setup, even with the file present and correctly named - only a genuine process environment variable at next build time worked reliably. This is a real, reproducible characteristic of this exact toolchain, not a one-off fluke; documented in the ADR as a caution for any future NEXT_PUBLIC_* addition.",
    "Fixed by fetching the (non-sensitive, by Turnstile's own design) sitekey from Key Vault via AzureKeyVault@2 in the CI Build stage and setting it as a real env var on that stage's build script step - the same fix applied to the E2ETests and VisualRegression jobs' own independent build steps (using Cloudflare's documented dummy sitekey there, not the real one), since CD's Web stage does checkout: none and only deploys the artifact CI already built - there is no second build step downstream to fix.",
    "CSP's connect-src listed www.google-analytics.com, but GA4's gtag.js actually beacons to a region-prefixed subdomain (region1.google-analytics.com, confirmed directly from a live browser console CSP violation, not assumed) - switched to the *.google-analytics.com wildcard, which CSP source-list syntax matches against any subdomain.",
  ],
  milestones: [
    "pipelines/ci/web.yml: added an AzureKeyVault@2 step fetching turnstile-site-key-devafusion, and NEXT_PUBLIC_TURNSTILE_SITE_KEY env vars on all three jobs that independently run next build (BuildWeb using the real Key Vault value, E2ETests and VisualRegression using Cloudflare's dummy test sitekey).",
    "next.config.ts: connect-src's google-analytics.com entry changed from www.google-analytics.com to the *.google-analytics.com wildcard.",
    "docs/adr/0014 updated with a dedicated 'Two live-deployment bugs found post-merge and fixed' section documenting both root causes and the empirical verification method used for each.",
  ],
  validation: [
    "Reproduced the NEXT_PUBLIC_TURNSTILE_SITE_KEY bug locally by building without the variable set and observing the exact same 'cannot render' console error as the live site, then fixed it by rebuilding with a real shell environment variable (not .env.local, which was empirically shown not to work reliably) and confirming the compiled chunk changed from a live property lookup to a dead-code-eliminated literal string.",
    "npm run typecheck and npm run lint both pass clean.",
    "This fix could not be validated against a real Azure DevOps pipeline run before being documented, since that requires a live CI trigger - the local build-output comparison is the strongest available proof short of that.",
  ],
  visibility: "public",
};
