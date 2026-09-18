import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "ci-fmt-check-directory-mismatch",
  date: "2026-09-17",
  title: "The real Azure DevOps CI run caught a terraform fmt gap every local check had missed",
  summary:
    "Opening the MFA matrix PR and letting devafusion-infrastructure-ci actually run against it (rather than trusting only local checks) surfaced a real formatting failure on two files every local terraform fmt -check run that session had reported as clean. Root cause: local checks were run from infrastructure/app; CI's terraformWorkingDirectory is infrastructure/app/environments/dev, and terraform fmt without -recursive only checks its own directory - a different, non-representative file set.",
  tags: ["terraform", "ci"],
  decisions: [
    "Reproduced the exact CI failure locally by matching every variable, not just the command: fetched the real PR merge ref (git fetch origin pull/64/merge), checked it out into a disposable git worktree, downloaded the exact Terraform version CI's TerraformInstaller@1 (latest) resolved to (1.16.3), and ran terraform fmt -check from the correct environments/dev directory - only then did the failure reproduce.",
    "Fixed with a plain terraform fmt run (canonical = -column alignment across email.tf and locals.tf), confirmed via Compare-Object that the only changes were whitespace before committing.",
    "Codified the directory-matching rule in infrastructure/AGENTS.md so this class of false-clean local check does not recur on a future infrastructure change.",
  ],
  milestones: [
    "Diagnosed the real Azure DevOps build failure via az devops invoke's build timeline/logs API, not just the PR checks summary.",
    "Fixed infrastructure/app/environments/dev/email.tf and locals.tf's attribute alignment.",
    "Added a 'Local Validation Must Match CI's Actual Working Directory' section to infrastructure/AGENTS.md.",
    "Documented the incident as a sixth addendum to docs/adr/0015.",
  ],
  validation: [
    "terraform fmt -check (from infrastructure/app/environments/dev, Terraform 1.16.3, matching CI exactly) passed.",
    "terraform validate (same directory/version) passed.",
    "terraform fmt -check -diff -recursive (from infrastructure/app) also passed, confirming no other formatting drift exists.",
  ],
  visibility: "public",
};
