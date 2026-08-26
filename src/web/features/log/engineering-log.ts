export type LogEntry = {
  slug: string;
  date: string;
  title: string;
  summary: string;
  tags: string[];
  decisions: string[];
  milestones: string[];
  validation: string[];
  commit?: string;
  pullRequest?: string;
  visibility: "public" | "private";
};

export const engineeringLog: LogEntry[] = [
  {
    slug: "seo-and-accessible-navigation",
    date: "2026-08-26",
    title: "SEO and accessible navigation",
    summary:
      "Improved the site's search visibility and made the shared navigation work better on small screens and with keyboards or assistive technology.",
    tags: ["seo", "accessibility", "next.js"],
    decisions: [
      "Use Next.js metadata conventions for canonical, social, robots, and sitemap output.",
      "Keep navigation interaction in a small client component while leaving page content server-rendered.",
      "Treat public engineering notes as sanitized content that can later be paired with protected private detail.",
    ],
    milestones: [
      "Added canonical, Open Graph, Twitter, and robots metadata.",
      "Added generated robots.txt and sitemap.xml routes.",
      "Added responsive navigation with explicit expanded and current-page state.",
    ],
    validation: ["npm run lint", "npm run typecheck", "npm run build"],
    commit: "667d113",
    visibility: "public",
  },
];

export function getLogEntry(slug: string) {
  return engineeringLog.find((entry) => entry.slug === slug);
}
