import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "postgresql-cost-circuit-breaker",
  date: "2026-09-14",
  title: "Cost circuit breaker for the PostgreSQL Flexible Server",
  summary:
    "Closed out ADR-0010's deferred 'cost circuit breaker' consequence: a Consumption Budget on the app resource group now warns at 80% actual spend and, at 100%, triggers an Action Group wired to an Automation Runbook that stops the PostgreSQL Flexible Server. Everything added stays inside Azure's free tier - no new billable resource.",
  tags: ["azure", "terraform", "database", "cost", "architecture"],
  decisions: [
    "Stop the server rather than delete/destroy anything - Flexible Server supports az postgres flexible-server stop, which halts compute billing while preserving all data, configuration and firewall rules. A false-positive budget trigger costs a temporary outage, never data loss, and restarting is a deliberate manual step, not an automatic one, so an unattended stop/start loop can never mask a genuine problem.",
    "Store the runbook's PowerShell content as a plain, reviewable .ps1 file in-repo (infrastructure/app/modules/cost-circuit-breaker/runbooks/), read via Terraform's data \"local_file\" and wired into azurerm_automation_runbook's content argument - the officially documented 'custom content' pattern - rather than publish_content_link's external-URL model or Azure Automation's own Source Control Integration feature, both of which would introduce a dependency outside this project's existing Terraform-only deployment model.",
    "Authenticate the runbook via the Automation Account's system-assigned managed identity (Connect-AzAccount -Identity) rather than embedding any credential in the script - consistent with root AGENTS.md's Zero Hardcoded Secrets rule extended to comments and script content alike.",
    "Grant that managed identity Contributor scoped to just the PostgreSQL server resource, not the resource group, via a dedicated azurerm_role_assignment - the runbook only ever needs to stop one specific server.",
    "Use the same two-threshold shape (80% actual = warn only, 100% actual = trigger the runbook) as Microsoft's own documented budget-automation reference architecture.",
    "Extended the pipeline's custom Terraform deployment role with the five actions this module's new resource types require (Microsoft.Automation/automationAccounts/*, Microsoft.Insights/actionGroups/*, Microsoft.Consumption/budgets/*, and Microsoft.Authorization/roleAssignments/write+read for the Contributor grant) via the same export-edit-reapply workflow established earlier - flagged the roleAssignments/write grant specifically as a privilege-escalation risk before it was applied, since it lets the pipeline's identity assign roles more broadly than just this one use case, consistent with root AGENTS.md's Duty to Warn standard.",
  ],
  milestones: [
    "Added infrastructure/app/modules/cost-circuit-breaker (main.tf, variables.tf, outputs.tf, runbooks/stop-postgresql.ps1) provisioning an Automation Account, Automation Runbook, Automation Webhook, Action Group, a scoped role assignment, and a Consumption Budget.",
    "Added infrastructure/app/environments/dev/cost-circuit-breaker.tf invoking the module against the PostgreSQL server created in the previous slice.",
    "Added a budget_notification_emails variable in dev.tfvars, pointed at an internal alerting mailbox not otherwise surfaced on the public site.",
    "Extended the pipeline's custom Terraform deployment role with the five actions listed above.",
  ],
  validation: [
    "terraform fmt -check -recursive (infrastructure/app/environments/dev) passed clean",
    "terraform validate passed clean, including hashicorp/local provider resolution for the new data \"local_file\" data source",
    "Verified Stop-AzPostgreSqlFlexibleServer's exact cmdlet name and required parameters against Microsoft's own PowerShell reference before writing the runbook script",
    "Verified azurerm_automation_account, azurerm_automation_runbook, azurerm_automation_webhook, azurerm_monitor_action_group and azurerm_consumption_budget_resource_group's full argument schemas against the pinned hashicorp/azurerm v4.81.0 provider documentation before writing the module",
  ],
  visibility: "public",
};
