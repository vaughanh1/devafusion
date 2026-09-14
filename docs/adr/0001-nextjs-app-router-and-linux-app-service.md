# Next.js App Router on Linux App Service

Devafusion needed a server-first web application with route-level metadata and
a clear path to interactive features where needed, so it uses Next.js's App
Router rather than the Pages Router or a static-export-only build. Hosting
runs on Azure Linux App Service (Node.js standalone output) rather than
Windows App Service or a serverless/edge platform (e.g. Vercel), because the
Linux hosting model is a straightforward fit for a standalone Next.js server
and keeps the project fully on Azure rather than splitting hosting across
providers. Started on the B1 App Service Plan as a proportionate, low-cost
baseline for an early-stage public site, with capacity reviewed as usage
grows. Managed App Service certificates and Next.js's own redirect
capabilities are used instead of introducing Azure Front Door, deferring
that cost and complexity until its routing features are actually justified.

## Status
Accepted

## Considered Options
- Vercel (native Next.js host) — rejected to keep all infrastructure
  consolidated on Azure under Terraform, rather than splitting the
  deployment surface across two providers.
- Windows App Service — rejected; Linux is the more natural fit for a
  Node.js standalone server and avoids Windows-specific IIS quirks.
- Static export — rejected; the roadmap already anticipated
  interactive/dynamic routes (health check endpoint, future auth) that a
  fully static export cannot serve.
- Azure Front Door from day one — rejected as premature; App Service's own
  managed certificates and Next.js redirects cover the current domain
  and routing needs without Front Door's added cost/complexity.
