import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "postgresql-zone-drift-and-automation-provider",
  date: "2026-09-14",
  title: "Cost circuit breaker's first apply hit two more first-use gaps",
  summary:
    "terraform apply for the cost-circuit-breaker module failed on two independent problems in the same run: a MissingSubscriptionRegistration for Microsoft.Automation (never registered on the subscription, same class of gap as the earlier PostgreSQL provider registration), and an availability-zone conflict on the PostgreSQL server itself, unrelated to the new module - Azure had auto-assigned a zone at creation time that the postgresql module never declared, so every subsequent plan tried to reconcile a diff the API rejects outright.",
  tags: ["incident", "azure", "terraform", "database"],
  decisions: [
    "Registered the Microsoft.Automation resource provider on the subscription - the same one-time-per-subscription activation gap hit before with Microsoft.DBforPostgreSQL, confirming this is a recurring pattern worth checking proactively the next time this project adopts a brand-new Azure service, not just reacting to it each time.",
    "Added an explicit zone variable to the postgresql module, defaulted to the real, already-assigned zone read directly from the live server (az postgres flexible-server show), rather than leaving it unset and fighting Azure's own auto-assignment on every future plan. Azure's API only allows a zone change via a high_availability standby-zone swap, never a plain attribute update, so pinning the real value is the only stable fix short of enabling HA.",
    "Verified via a real terraform plan against the actual remote state (not just terraform validate) that this fix produces zero destroy or replace against the PostgreSQL server before treating the fix as done - validate alone cannot catch state-vs-config drift like this, only a plan against real state can.",
    "Traced the plan's separately-reported '1 to destroy' to a same-resource record sub-block replacement on an existing devafusion.co.uk Google-verification DNS TXT record, unrelated to either fix in this entry - confirmed by its complete absence from any PostgreSQL-related plan output before concluding the zone fix itself was destroy-free, rather than assuming the count referred to the resource being actively worked on.",
  ],
  milestones: [
    "Registered Microsoft.Automation on the Devafusion subscription; confirmed registrationState reached Registered.",
    "Added a zone variable (default matching the real assigned zone) to infrastructure/app/modules/postgresql, wired into the azurerm_postgresql_flexible_server resource.",
    "Ran terraform plan against the real backend state and confirmed zero destroy/replace actions against the PostgreSQL server.",
  ],
  validation: [
    "terraform fmt -check -recursive (infrastructure/app/environments/dev) passed clean",
    "terraform validate passed clean",
    "terraform plan against the real remote state showed the PostgreSQL server resource with no create, destroy, or replace action - update-in-place only, consistent with a value that was already correct in Azure just now being declared in config",
  ],
  visibility: "public",
};
