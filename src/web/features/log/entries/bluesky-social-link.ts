import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "bluesky-social-link",
  date: "2026-09-16",
  title: "Bluesky added as a verified social identity",
  summary:
    "Published Bluesky (@devafusion.net) alongside GitHub, X and LinkedIn as a rel=\"me\" identity-verified link, and provisioned the AT Protocol domain-handle verification DNS record so bsky.app can confirm ownership of devafusion.net.",
  tags: ["seo", "nextjs", "terraform", "accessibility", "content"],
  decisions: [
    "Bluesky uses devafusion.net as its handle (@devafusion.net) rather than a bsky.social subdomain, which is why domain-handle verification via an _atproto TXT record is required rather than the simpler in-app verification flow.",
    "Added \"bluesky\" to the existing SocialPlatform union and a single new entry in features/brand/social-links.ts, positioned between GitHub and X, rather than introducing a parallel data structure - SiteFooter, /about, /contact and the Organization JSON-LD's sameAs array all pick it up automatically with no per-surface change, exactly the reuse this single-source-of-truth module exists for.",
    "SocialPlatformIcon gained a \"bluesky\" case using the official Simple Icons butterfly glyph as inline SVG (same pattern as the existing GitHub/X/LinkedIn glyphs) rather than a new icon library dependency, per the Standardized Tooling rule.",
    "The _atproto TXT record's value is sourced from a Key Vault secret (bluesky-site-verification-devafusion-net) via a read-only data source, following the same manual-secret-creation/Terraform-reads-only pattern already used for the Google Search Console verification records - Terraform never writes the verification value into state.",
  ],
  milestones: [
    "features/brand/social-links.ts: added \"bluesky\" to SocialPlatform and a Bluesky entry between GitHub and X.",
    "components/brand/social-platform-icon.tsx: added the Bluesky glyph case.",
    "app/contact/page.tsx: metadata description now mentions Bluesky alongside GitHub, X and LinkedIn.",
    "infrastructure: added the bluesky-site-verification-devafusion-net Key Vault data source and the devafusion.net _atproto TXT record.",
    "Verified the new link inherits rel=\"me\", aria-label and Organization JSON-LD sameAs behaviour with no per-surface code change, and confirmed terraform fmt -check / terraform validate pass for the DNS change.",
  ],
  validation: ["terraform fmt -check", "terraform validate", "npm run typecheck", "npm run lint", "npm run test:unit"],
  visibility: "public",
};
