import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "pipeline-naming-consistency",
  date: "2026-08-28",
  title: "Standardized pipeline naming to devafusion-<domain>-<ci|cd>",
  summary:
    "The web and infrastructure pipeline pairs had drifted onto two different naming schemes - fixed the half of each pair that didn't match its sibling so every pipeline name, YAML file path, and cross-pipeline resource reference now follows the same devafusion-<domain>-<ci|cd> pattern.",
  tags: ["devops", "azure-devops", "terraform"],
  decisions: [
    "Standardize on the infrastructure/ domain name (matching the actual repository folder and its infrastructure/AGENTS.md spoke) rather than terraform, since terraform is the tool used inside that domain, not the domain itself.",
    "Fix whichever half of each CI/CD pair didn't already match the target pattern, rather than picking a side arbitrarily: devafusion-web-ci and devafusion-infrastructure-cd were already correct, so devafusion-dev-cd and devafusion-terraform-ci were the ones renamed.",
    "Leave the Azure App Service name, resource group name, and Azure DevOps environment name (devafusion-dev) untouched, since those identify Azure resources and an approval environment, not pipeline identity, and are outside this naming pass.",
  ],
  milestones: [
    "Renamed pipelines/ci/terraform.yml to pipelines/ci/infrastructure.yml and updated its self-referencing trigger/pr path filters.",
    "Renamed pipelines/cd/dev.yml to pipelines/cd/web.yml.",
    "Updated pipelines/cd/infrastructure.yml's pipeline resource (name, source, download alias) and plan artifact path to match the renamed CI pipeline.",
    "Updated AGENTS.md's Pre-Flight Gate path check and gitleaks CI reference to the renamed pipeline files and name.",
    "Flagged the matching Azure DevOps portal renames (devafusion-terraform-ci to devafusion-infrastructure-ci, devafusion-dev-cd to devafusion-web-cd) as a manual follow-up, since registered pipeline definitions live outside this repository.",
  ],
  validation: [
    "git diff --check",
    "Reviewed both renamed and both untouched pipeline YAML files for every remaining cross-reference to the old file paths and pipeline names.",
  ],
  visibility: "public",
};
