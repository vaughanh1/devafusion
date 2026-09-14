import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "devafusion-about-contact-seo-presence",
  date: "2026-09-14",
  title: "Devafusion digital presence: About, Contact and Organization schema",
  summary:
    "Rewrote the About page with the full Deva Victrix origin story and engineering-principles copy, built out the Contact page stub, published GitHub/X/LinkedIn as rel=\"me\" identity-verified links, and added Organization JSON-LD plus a sitemap fix so the site is genuinely discoverable and verifiable by Google Search Console.",
  tags: ["seo", "nextjs", "content", "accessibility"],
  decisions: [
    "Single source of truth for social/contact identity in features/brand/social-links.ts, consumed by SiteFooter, /about and /contact so the URLs never drift out of sync between the three surfaces.",
    "rel=\"me\" on every GitHub/X/LinkedIn link - the microformat Google and the IndieWeb use to verify identity ownership, which is what makes the Organization JSON-LD's sameAs entries verifiable rather than arbitrary outbound links.",
    "Only hello@devafusion.com (general) and legal@devafusion.com (privacy/legal) are published as public contact points; billing@devafusion.com is provisioned and monitored but deliberately not surfaced anywhere yet since it has no live use today - publishing an unused mailbox is a trust-eroding dark pattern this site avoids.",
    "/legal is now linked permanently in SiteFooter on every page instead of being a contact-page-only deep link, since privacy/cookie disclosure should always be one click away, not buried.",
    "sitemap.ts now generates /log/[slug] and /projects/[slug] entries dynamically from engineeringLog and projects instead of a hardcoded static route array - every published log entry was previously invisible to search engines.",
    "Log entries in the sitemap use their own real date field for lastModified instead of a build-time timestamp, since stamping every page as \"changed\" on every deploy causes Google to deprioritize recrawling pages it believes it just saw.",
    "Organization JSON-LD rendered once in the root layout (components/seo/organization-schema.tsx) rather than per-page, declaring name, url, logo, email and the sameAs array of verified social profiles.",
  ],
  milestones: [
    "Rewrote /about with the Deva Victrix origin story, the Roman Madder Red/Legionary Gold/Gladius Steel visual-DNA explanation, an engineering-principles section (TDD/BDD, CI/CD, Clean Code, IaC, continuous learning), and internal links to the engineering log and project entry.",
    "Built out /contact from a placeholder stub to a real page with email and social contact channels.",
    "Added SocialLinksRow (compact and labelled variants) and wired it into SiteFooter, /about and /contact.",
    "Added the OrganizationSchema JSON-LD component and wired it into the root layout.",
    "Fixed sitemap.ts to dynamically enumerate log and project detail routes with real lastModified dates, and updated its test suite to match.",
    "Verified with npm run typecheck, npm run lint, npm run test:unit and a full npm run build, then inspected the prerendered HTML for /, /about and /contact to confirm the JSON-LD, footer links and rel=\"me\" attributes all render correctly.",
  ],
  validation: ["npm run typecheck", "npm run lint", "npm run test:unit", "npm run build"],
  visibility: "public",
};
