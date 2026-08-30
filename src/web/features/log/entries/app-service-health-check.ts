import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "app-service-health-check",
  date: "2026-08-27",
  title: "Enable Azure App Service Health check for the dev web app",
  summary:
    "Added a dedicated health endpoint and wired Azure App Service Health check to it, so a persistently unhealthy instance is detected and eventually replaced even on the current single-instance B1 plan.",
  tags: ["reliability", "azure", "terraform", "nextjs"],
  decisions: [
    "Enable Health check now rather than deferring it until the App Service plan scales to multiple instances. It still pings the default hostname every minute and will replace a single unhealthy instance after it stays unhealthy for an hour; the full load-balancer rerouting benefit only appears with 2+ instances, but the detection-and-replacement safety net is useful at any instance count.",
    "Add a standalone /api/health Route Handler instead of reusing an existing page, since Health check requires a path that returns 200-299 only when the app is fully healthy and does not follow redirects - a dedicated route avoids any accidental coupling to page-level redirects or metadata.",
    'Mark the route `export const dynamic = "force-dynamic"` so every ping gets a live response rather than a statically cached one.',
    "Set health_check_eviction_time_in_min to 2, the minimum of the provider's 2-10 range, to remove an unhealthy instance from rotation as quickly as the platform allows.",
    "Make health_check_path/health_check_eviction_time_in_min optional on the webapp module (default null path, eviction time only passed through when a path is set) rather than hardcoding them into the module, so a future environment can opt out without editing the module itself.",
  ],
  milestones: [
    'Added src/web/app/api/health/route.ts returning { status: "ok" } with 200, or { status: "error" } with 503 on a caught failure.',
    "Added health_check_path and health_check_eviction_time_in_min variables to the webapp module and wired them into site_config.",
    'Set health_check_path = "/api/health" and health_check_eviction_time_in_min = 2 on the dev environment\'s webapp module call.',
  ],
  validation: [
    "npm run build confirmed /api/health compiles and is correctly marked Dynamic (ƒ) rather than static.",
    'Ran the built standalone server locally and confirmed GET /api/health returned 200 with { "status": "ok" }.',
    "terraform fmt -check",
    "terraform validate",
  ],
  visibility: "public",
};
