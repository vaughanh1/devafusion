import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "project-inception-and-architecture",
  date: "2026-08-26",
  title: "Project inception and architecture",
  summary:
    "Established Devafusion as a public technical laboratory and chose a code-first, auditable path for its web application, Azure infrastructure, delivery process, and future documentation.",
  tags: ["architecture", "azure", "terraform", "devops", "gdpr"],
  decisions: [
    "Use Next.js App Router for a server-first web application with route-level metadata, an efficient deployment model, and a clear path to interactive features where needed.",
    "Use Linux App Service with Node.js because the application is a Node-based web workload and the Linux hosting model is a straightforward fit for the standalone Next.js server.",
    "Start with the Azure B1 App Service plan as a proportionate, low-cost baseline for an early-stage public site, with capacity and reliability requirements to be reviewed as usage grows.",
    "Manage Azure resources with Terraform from the outset so infrastructure is reviewable, repeatable, and separated from application code.",
    "Use GitHub for source control and pull requests, Azure DevOps for CI/CD, and protected approval environments for infrastructure changes.",
    "Use managed App Service certificates and Next.js redirection capabilities to avoid introducing Azure Front Door before its cost and routing features are justified.",
    "Keep public engineering summaries sanitized and design future private detail as protected data rather than embedding personal or sensitive information in this public repository.",
  ],
  milestones: [
    "Created a repository structure separating infrastructure, application code, and pipeline definitions.",
    "Established branch, pull request, pipeline, and resource naming conventions around the develop workflow.",
    "Added repository and VS Code tooling for Terraform, YAML, ESLint, Prettier, EditorConfig, GitHub pull requests, and Azure App Service.",
    "Added linting, TypeScript checking, and build validation to the web CI path, with Husky providing a local commit-time quality gate.",
    "Separated web and infrastructure deployment pipelines so web-only changes do not require a Terraform plan.",
  ],
  validation: [
    "Reviewed Terraform-managed Linux App Service and managed certificate configuration.",
    "Reviewed Azure DevOps CI/CD triggers, artifacts, and approval environment configuration.",
    "Confirmed current checks include lint, typecheck, and production build; Playwright testing is planned next.",
  ],
  visibility: "public",
};
