import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "about-and-footer-ux-cleanup",
  date: "2026-09-14",
  title: "About page tone, footer decluttering, and JSON-LD console warning fix",
  summary:
    "Reworked the About page copy to read as an engineering exploration site rather than a company - removed first-person/company voice, expanded the 'Dev a fusion' pun to its literal 'Develop a Fusion' meaning, cited the Deva Victrix Wikipedia entry as a real historical source, and removed the duplicate 'Get in Touch' block in favour of a single link to the Contact page. Decluttered the site footer (dropped the tagline, fixed a literal '&amp;' rendering bug, routed the email affordance to /contact instead of a mailto: link, collapsed the always-open theme/scale controls behind a single 'Theme' disclosure, and replaced plain-text social labels with real platform logos). Also swapped the raw JSON-LD <script> tag for next/script to eliminate a React-DOM dev console warning.",
  tags: ["content", "seo", "nextjs", "a11y"],
  decisions: [
    "About page no longer repeats email addresses and the social links row already published on /contact - DRY applies to content, not just code, so /about now links to /contact once instead of maintaining a second copy of the same contact data.",
    "Framed the Roman-engineering-heritage narrative as a discipline that still evolves - the site works in vertical slices and keeps re-evaluating its tooling, rather than reading as a fixed, unchanging doctrine.",
    "Cited https://en.wikipedia.org/wiki/Deva_Victrix inline as a real outbound historical reference instead of asserting Roman-era claims with no source.",
    "SocialLink now carries a platform key (github | x | linkedin) consumed by a new SocialPlatformIcon component with inline official-brand SVG glyphs, rather than adding an icon library dependency - keeps SiteFooter, /about and /contact rendering real logos instead of plain text labels.",
    "ThemeSelector's colour/scale controls are now behind a single <details>/<summary> disclosure instead of always-rendering six-plus buttons inline in the footer - standard collapsed-menu pattern, keeps the footer from sprawling as more theme/scale options are added.",
    "Footer's contact affordance now routes to /contact (an in-app page) instead of firing mailto:, since the primary email address is already published there and a page navigation is a lower-friction, more consistent UX than triggering the visitor's mail client.",
    "Replaced the raw <script type=\"application/ld+json\"> element with next/script's <Script> component (with a stable id) - React-DOM warns in dev whenever any literal <script> tag appears in the render tree, since scripts inserted via client-side DOM mutation never execute; next/script is Next's supported way to render this without the warning, and it changes nothing about what search engines read from the SSR'd HTML.",
  ],
  milestones: [
    "Removed marketing-voice phrasing ('we', 'not a marketing claim') from About page copy.",
    "Removed the duplicate 'Get in Touch' section from /about; replaced with a single pointer link to /contact.",
    "Fixed the footer's literal '&amp;' text bug ('Privacy &amp; cookies' rendered as the HTML entity string, not '&') and removed the 'Built to explore, experiment and learn' tagline to reduce footer clutter.",
    "Added SocialPlatformIcon (GitHub/X/LinkedIn inline SVG) and wired it into SocialLinksRow for both compact (footer) and labelled (About/Contact) variants.",
    "Collapsed ThemeSelector's colour and text-size controls behind a single 'Theme' disclosure trigger.",
    "Verified the rendered /about output and the footer locally with a scripted Playwright check (SVG icon count, disclosure open/close, link hrefs, console warnings) before committing.",
  ],
  validation: ["manual local dev verification (npm run dev + scripted Playwright checks)"],
  visibility: "public",
};
