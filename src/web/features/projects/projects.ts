export type Project = {
  slug: string;
  title: string;
  summary: string;
  description: string;
  tags: string[];
  status: "active" | "planned" | "complete";
};

export const projects: Project[] = [
  {
    slug: "devafusion",
    title: "Devafusion",
    summary:
      "A public technical laboratory for software engineering, cloud architecture, and the decisions behind building and operating a modern web application.",
    description:
      "Devafusion is both the product and the record of its construction. It uses Next.js for the web experience, Terraform for repeatable Azure infrastructure, and Azure DevOps pipelines for separated web and infrastructure delivery.",
    tags: ["next.js", "azure", "terraform", "devops"],
    status: "active",
  },
];

export function getProject(slug: string) {
  return projects.find((project) => project.slug === slug);
}
