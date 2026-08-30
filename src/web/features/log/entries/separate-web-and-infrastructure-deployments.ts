import type { LogEntry } from "../types";

export const entry: LogEntry = {
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
};
