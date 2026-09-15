import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "cd-migration-pipeline",
  date: "2026-09-15",
  title: "CD pipeline runs the first real database migration, gated by manual approval",
  summary:
    "Wired pipelines/cd/web.yml to actually apply drizzle-kit migrations to the live psql-devafusion-dev-uks server - a temporary named firewall rule for the CD agent, manual approval on a dedicated Azure DevOps environment, and the exact pending SQL printed in CI before that approval gate is ever reached. Hit and resolved a real design mistake along the way: the first attempt split detection/preview into a separate stage from the approval-gated apply stage using a cross-stage output-variable condition whose exact syntax could not be verified against an authoritative Microsoft example - rebuilt as a single job with same-job variables instead, since an unverified expression against a production database is not an acceptable risk.",
  tags: ["database", "azure", "security", "architecture"],
  decisions: [
    "Abandoned the cross-stage output-variable design (a detection stage feeding a condition on a later apply stage) after four separate documentation searches failed to surface Microsoft's own authoritative example of the exact expression syntax needed. Found the real answer afterward by accident (dependencies.<Stage>.outputs[...] for condition:, stageDependencies.<Stage>.<Job>.outputs[...] for variables: - two different context names for the same concept) but had already committed to the safer single-job design by then, and kept it rather than reintroduce the complexity for no remaining benefit.",
    "Caught a real ordering bug before it shipped: the first draft put the SQL-preview step inside the same approval-gated deployment job as the migration itself. Azure DevOps environment approval checks pause a deployment job before any of its steps run, so that would have shown the pending SQL only after approval - exactly backwards. Moved the preview into pipelines/ci/web.yml's Build stage instead, which already runs on every merge with zero Azure/DB access, so the SQL is visible in the triggering CI run's log before the CD approval gate is ever reached.",
    "Put the manual approval on a new, dedicated devafusion-dev-migrations environment rather than the existing devafusion-dev environment used by the app-deploy stage - Azure DevOps approval checks are configured per-environment, not per-stage, so reusing devafusion-dev would have forced every ordinary app deploy through the same manual gate.",
    "Reused Microsoft's own documented temporary-firewall-rule pattern (confirmed via Azure/postgresql-action's GitHub Action docs this session's earlier slice) rather than any wide-open rule, permanent IP-range allowlist, or persistent self-hosted agent.",
    "Percent-encoded the admin password via python3 (preinstalled on ubuntu-latest, no new dependency) before building the connection string, mirroring web.tf's own urlencode() - the raw secret may contain characters that would otherwise corrupt the URL.",
    "Confirmed drizzle-kit migrate has no dry-run/--pretend flag (checked Drizzle's own docs directly) - the SQL-file-content preview in CI is the closest achievable equivalent to a true dry run.",
    "Documented as an explicit, not-yet-verified risk (ADR-0013) that sc-devafusion-terraform's firewall-rule RBAC permission is inferred from an existing wildcard grant, not directly proven under that identity - to be watched on the first real ApplyMigration run.",
  ],
  milestones: [
    "Added a 'Preview pending database migration' step to pipelines/ci/web.yml's Build stage - prints the exact SQL of any new file under src/web/drizzle/**/*.sql via git diff HEAD^ HEAD, with zero Azure/DB access.",
    "Added an ApplyMigration stage to pipelines/cd/web.yml, gated on the devafusion-dev-migrations environment: detects a pending migration, opens/closes a temporary named firewall rule (cd-agent-temp) for the agent's own IP, fetches the admin password from Key Vault, runs drizzle-kit migrate, and always cleans up the firewall rule even on failure.",
    "Added dependsOn: ApplyMigration to the existing Web deploy stage - app deploy only proceeds if the migration stage succeeds (including a no-op skip when no migration is pending).",
    "Added docs/adr/0013-cd-migration-pipeline.md.",
    "Documented the required one-time manual Azure DevOps setup step (create devafusion-dev-migrations environment, add approvers) in infrastructure/AGENTS.md - not yet done as of this commit.",
  ],
  validation: [
    "Validated both pipelines/cd/web.yml and pipelines/ci/web.yml as syntactically correct YAML via python -c \"import yaml; yaml.safe_load(...)\" after every edit",
    "Confirmed the deployment-job checkout: self behaviour (not automatic, must be explicit) directly against Microsoft's own deployment-jobs documentation before relying on it",
    "Confirmed via az postgres flexible-server firewall-rule list against the live server that the existing named-rule convention (web-app-outbound-N) this design extends is exactly what is already running in production",
    "This slice has NOT yet been run for real in Azure DevOps - the devafusion-dev-migrations environment and its approval check do not exist yet, and this is called out explicitly as an open item rather than assumed complete",
  ],
  visibility: "public",
};
