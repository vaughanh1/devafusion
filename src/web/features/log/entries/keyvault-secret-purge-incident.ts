import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "keyvault-secret-purge-incident",
  date: "2026-08-27",
  title: "A resource-to-data-source rename tried to purge two live secrets",
  summary:
    "Converting two Key Vault secrets from Terraform-managed resources to data sources deleted them from Azure instead, because Terraform only saw the resource address disappear from config. A missing Purge permission on the access policy is the only thing that stopped the deletion from becoming permanent. Recovered both secrets, cleaned up state, and closed the underlying gap in the provider configuration.",
  tags: ["incident", "terraform", "azure", "key-vault"],
  decisions: [
    "Treat 'convert this resource to a data source' as a resource address migration, not a plain config edit. Terraform has no way to know a resource and a data source with different addresses refer to the same real object; it read the resource block's disappearance as 'destroy this', and destroy on a Key Vault secret is a delete, followed by an attempted purge.",
    "Recover, don't recreate. Azure Key Vault's soft-delete preserves the secret's value, so `az keyvault secret recover` restored both secrets exactly as they were, with zero risk of a mismatched value reaching the live DNS TXT records.",
    "Fix the provider default, not just the immediate state. `purge_soft_delete_on_destroy` defaults to true; explicitly setting it to false means any future destroy of a Key Vault secret - accidental or intended - soft-deletes and stays recoverable, rather than racing to purge it in the same apply.",
    "Run the state cleanup (`terraform state rm`) locally under a personal Azure AD account, then stop there rather than also running `terraform apply` locally: the local identity's object ID differs from the pipeline service principal's, and a local apply would have replaced the Key Vault access policy to grant the wrong identity, breaking every future pipeline run's Key Vault access.",
  ],
  milestones: [
    "Recovered google-site-verification-devafusion-com and google-site-verification-devafusion-net via az keyvault secret recover; both restored with their original values and version IDs intact.",
    "Manually restarted the App Service, since the CD pipeline's own restart step never ran after the apply failed.",
    "Removed the two orphaned azurerm_key_vault_secret resource entries from Terraform state with terraform state rm, without touching the real secrets.",
    "Set features.key_vault.purge_soft_delete_on_destroy = false on the azurerm provider.",
    "Added AGENTS.md rules covering resource address migrations and Key Vault purge safety.",
  ],
  validation: [
    "az keyvault secret list-deleted confirmed both secrets recoverable before action, and az keyvault secret show confirmed values present after recovery",
    "az webapp show confirmed the App Service was Running after the manual restart",
    "terraform state list confirmed only the data source addresses remain, with no orphaned resource entries",
    "terraform fmt -check",
    "terraform validate",
  ],
  visibility: "public",
};
