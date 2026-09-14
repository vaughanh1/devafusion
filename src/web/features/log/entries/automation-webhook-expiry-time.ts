import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "automation-webhook-expiry-time",
  date: "2026-09-14",
  title: "Automation webhook rejected a far-future expiry time",
  summary:
    "The cost-circuit-breaker module's apply got past the earlier provider-registration and zone blockers, created the Automation Account, Runbook, and role assignment cleanly, then failed on the budget-trigger webhook: Azure's Automation webhook API returned a plain 'Invalid expiry time' 400 for an expiry_time set decades out (2099), with no documented ceiling given anywhere in the REST reference. Replaced the hardcoded far-future literal with a bounded, variable expiry 10 years out, and documented rotating it as a deliberate operational task rather than guessing at the undocumented real limit.",
  tags: ["incident", "azure", "terraform"],
  decisions: [
    "Stopped guessing at Azure's exact undocumented expiry ceiling once a search of the REST API reference and the azurerm provider's own issue tracker turned up no stated maximum - picked a bounded, clearly-reasonable value instead of trying more far-future literals until one happened to work.",
    "Made webhook_expiry_time a module variable defaulted to 10 years out rather than a hardcoded literal, so the concrete date lives in the environment's .tfvars where it's visible and can be rotated without touching the module itself.",
    "Documented the rotation requirement directly in the variable's description and the resource's comment, rather than letting a webhook silently go stale years from now with no record of why a expiry date was chosen or that it needs attention before lapsing.",
  ],
  milestones: [
    "Added a webhook_expiry_time variable to the cost-circuit-breaker module, defaulted to a bounded, multi-year-out date.",
    "Wired azurerm_automation_webhook.stop_postgresql's expiry_time to the new variable.",
  ],
  validation: [
    "terraform fmt -check -recursive (infrastructure/app/environments/dev) passed clean",
    "terraform validate passed clean",
  ],
  visibility: "public",
};
