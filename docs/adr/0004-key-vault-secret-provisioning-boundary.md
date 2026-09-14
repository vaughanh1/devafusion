# Terraform reads secrets, never writes them

Secret *values* (API keys, verification strings, GA4 IDs, and eventually
database credentials) are always created or rotated manually, directly in
Azure Key Vault — Terraform only ever reads them back via
`data "azurerm_key_vault_secret"` and wires them into resources (DNS TXT
records, App Service `app_settings`). Terraform must never be the thing
that writes a real secret value into state, a `.tfvars` file, or an Azure
DevOps variable group.

## Status
Accepted

## Considered Options
- Terraform-managed `azurerm_key_vault_secret` *resources*, with the value
  passed in as a sensitive Terraform variable — rejected. This was the
  project's original approach for the Google Search verification strings,
  but a later resource-to-data-source conversion (moving off this pattern)
  caused Terraform to read the resource block's disappearance as "destroy
  this," triggering the 2026-08-27 secret purge incident. The
  resource-managed pattern also means the secret value must pass through
  a `TF_VAR_*` pipeline mapping at some point, which the Secret Provisioning
  rule now forbids outright.
- An Azure DevOps Library variable group linked to Key Vault, feeding
  `TF_VAR_*` mappings — rejected during the GA4 analytics work: it requires
  Key Vault to already be populated before Terraform can create it, which
  is circular for a Key Vault this same Terraform config provisions.

## Consequences
- Every new secret-backed integration (the next one being the PostgreSQL
  admin credential) follows the same shape: a human creates the value in
  Key Vault first, Terraform reads it via a data source second.
- Any future `azurerm_key_vault_secret` *resource* block for a value that
  should be data-only is a review-blocking regression against this ADR.
