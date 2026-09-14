# devafusion.net is the canonical domain

`devafusion.net` is the single canonical domain for SEO, metadata, and
redirects. `devafusion.com` and `devafusion.co.uk` both 301-redirect to
`.net`. This was originally the reverse (`.com` treated as canonical,
`.net` redirecting to it) until corrected on 2026-08-30.

## Status
Accepted (supersedes an earlier, reversed configuration)

## Considered Options
- `devafusion.com` as canonical — this was the original configuration.
  Reversed because `.com` carries legacy Exchange/Outlook mail routing
  (MX, autodiscover records) that only makes sense for a domain actually
  hosting a mailbox, making it a less natural choice as the primary public
  identity than `.net`.

## Consequences
- `local.primary_domain`/`local.secondary_domain` in
  `infrastructure/app/environments/dev/locals.tf`, `next.config.ts`'s
  redirect rules, and the fallback literal in `layout.tsx`'s
  `metadataBase`, `robots.ts`, and `sitemap.ts` must always agree with this
  ADR. Any new domain (e.g. a future TLD) must redirect to `.net`, never
  the reverse, and any code touching the primary/secondary domain locals
  should treat this as the settled direction, not something to
  re-litigate per change.
