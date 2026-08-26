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
    slug: "separate-web-and-infrastructure-deployments",
    date: "2026-08-26",
    title: "Separate web and infrastructure deployments",
    summary:
      "Separated web delivery from Terraform application delivery so a web-only change does not depend on an infrastructure plan or approval stage.",
    tags: ["devops", "terraform", "azure-devops"],
    decisions: [
      "Keep devafusion-dev-cd focused on deploying the web artifact from devafusion-web-ci.",
      "Give Terraform apply its own CD pipeline, triggered by successful Terraform CI runs on develop.",
      "Keep infrastructure approval attached to the devafusion-dev environment without coupling it to web releases.",
    ],
    milestones: [
      "Removed the Terraform stage and plan download from the web CD pipeline.",
      "Added a dedicated infrastructure CD pipeline for Terraform plan application.",
      "Made pipeline completion triggers explicit for the develop branch.",
    ],
    validation: ["git diff --check", "Next.js build and typecheck"],
    visibility: "public",
  },
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
