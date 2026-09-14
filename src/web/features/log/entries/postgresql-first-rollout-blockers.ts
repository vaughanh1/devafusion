import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "postgresql-first-rollout-blockers",
  date: "2026-09-14",
  title: "PostgreSQL's first rollout hit two first-use-only Azure gaps",
  summary:
    "terraform apply for the new postgresql module failed twice in a row, each time on a completely different problem: first an AuthorizationFailed on Microsoft.DBforPostgreSQL/flexibleServers/write because the pipeline's custom role had never included that action, then (once fixed) a MissingSubscriptionRegistration because the subscription itself had never activated the Microsoft.DBforPostgreSQL resource provider. Both were first-use-only gaps - nothing wrong with the module - fixed manually and out of band, and the third apply succeeded end to end (15 added, 4 changed, 0 destroyed), creating the server and all 14 web-app-outbound-* firewall rules cleanly. A ClientIPAddress_* rule was also observed on the server between the second (failed) and third (successful) apply. It was mistakenly deleted on an unverified assumption that it had been manually added; the successful apply's own log never created or referenced that name, so its origin was never actually confirmed. It has since been restored (same name, same IP address) once the deletion was recognized as a mistake, since a resource this project did not create is not this project's decision to remove.",
  tags: ["incident", "azure", "terraform", "database"],
  decisions: [
    "Extend the pipeline's existing custom Terraform deployment role manually via an exported-edit-reapply JSON workflow (az role definition list > file, edit, az role definition update @file) rather than an inline JSON string on the command line - safer against shell-quoting corruption and gives a reviewable diff before applying, and matches how this same role was extended once before for the Google Search verification work.",
    "Added Microsoft.DBforPostgreSQL/flexibleServers/* to the role's actions, matching the existing wildcard-per-resource-type granularity already used for Microsoft.Web/serverfarms/* and Microsoft.KeyVault/vaults/* in the same role, rather than introducing a new, more granular convention for just this one resource type.",
    "Registered the Microsoft.DBforPostgreSQL resource provider on the subscription (az provider register) as a second, separate manual step - a custom role granting an action on a resource provider does not implicitly register that provider on the subscription; this is Azure's own one-time-per-subscription activation step, orthogonal to RBAC, and every brand-new Azure service this project ever adopts will need the same check.",
    "Mistakenly deleted the ClientIPAddress_* rule directly via az postgres flexible-server firewall-rule delete on the unverified assumption that it had been manually added for diagnostics. Its absence from Terraform state does not establish who or what created it - the pipeline's own successful-apply log lists only the 14 web-app-outbound-* rules and never mentions this one, so its origin was genuinely unconfirmed either way. Restored it immediately (same name, same IP) once the mistake was identified: deleting a resource this project did not knowingly create, on a guess about its provenance, is the wrong default - the safe default is to leave an unexplained resource alone and ask, not remove it.",
  ],
  milestones: [
    "Extended the pipeline's custom Terraform deployment role with Microsoft.DBforPostgreSQL/flexibleServers/*.",
    "Registered the Microsoft.DBforPostgreSQL resource provider on the Devafusion subscription; confirmed registrationState reached Registered before re-running the pipeline.",
    "Re-ran devafusion-infrastructure-cd; terraform apply succeeded, creating psql-devafusion-dev-uks and all 14 web-app-outbound-* firewall rules.",
    "Mistakenly deleted the ClientIPAddress_2026-9-14_16-41-26 firewall rule, then restored it (same name, same IP) once the deletion was identified as based on an unverified assumption.",
  ],
  validation: [
    "az postgres flexible-server show confirmed state: Ready, sku: Standard_B1ms, version: 16.",
    "az postgres flexible-server firewall-rule list confirmed all 15 rules present after restoration - the 14 web-app-outbound-* Terraform-managed rules plus the restored ClientIPAddress_* rule - matching the state that existed before the mistaken deletion.",
    "az webapp config appsettings list confirmed DATABASE_URL present on the live devafusion-dev web app.",
  ],
  visibility: "public",
};
