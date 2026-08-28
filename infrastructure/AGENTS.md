# Infrastructure Spoke

Governs `infrastructure/**` and `pipelines/*terraform.yml` /
`pipelines/*infrastructure.yml`. Universal rules (Persona, Git
discipline, Pre-Flight Gate, PR pipeline) live in the root
[`AGENTS.md`](../AGENTS.md); this file holds the Terraform/Azure rules
specific to this infrastructure.

## Terraform

- Zero manual infrastructure changes via the Azure Portal. Everything must be declared declaratively in `.tf` configuration files. Use explicit resource tracking, strict variable typing, and locked provider versions. No hardcoded secrets or tenant IDs — use environment tokens or Azure Key Vault references.
- **No Repeated Literals:** A given value (a domain name, resource name, tag map, SKU, etc.) must be defined once — as a `variable`, `local`, or a resource attribute referenced by other resources — and never restated as a second hardcoded literal elsewhere. If two resources need the same string, the second must reference the first's attribute (e.g. `azurerm_dns_zone.example.name`), not repeat the literal. The one narrow exception is a Terraform `backend` block: backend configuration is parsed before variables or locals are resolved, so it cannot reference them, and a literal there is a hard technical constraint rather than a style choice.
- **Idempotency:** All scripts, especially Terraform configurations and database migrations, must be idempotent. A script must be safely runnable multiple times without causing errors or unintended side effects.
- **Resource Address Migrations:** Changing how an existing object is declared — converting a managed `resource` to a `data` source, renaming a resource, or moving it between modules — is never a plain config edit. Terraform only sees the address disappear from config and will plan a destroy against the *real* object. Use `terraform state rm` (to stop tracking without touching the real object) or a `moved` block (for straight renames/moves) as part of the same change, and confirm with `terraform plan` that no destroy is proposed before merging.

## Secret Provisioning

- The one sanctioned manual step is creating or rotating a secret's *value* directly in Azure Key Vault. Terraform reads that value with `data "azurerm_key_vault_secret"` and wires it into resources (e.g. App Service `app_settings`); Terraform must never be the thing that writes a real secret value into state or a variable group. Pipelines must not hold secret values themselves — no `TF_VAR_*` mappings from Azure DevOps variable groups for anything that belongs in Key Vault.

## Azure Key Vault

- **Key Vault Purge Safety:** The `azurerm` provider's `features.key_vault.purge_soft_delete_on_destroy` must be explicitly set to `false`. The default is `true`, which makes Terraform attempt an immediate hard purge on every destroy — including on a resource that was removed from config by mistake. A Key Vault access policy that never grants `Purge` only prevents *data loss*; it doesn't prevent the destroy from being attempted, and a policy that does grant `Purge` would not stop it at all.

## Azure App Service

- **Azure App Service Restart:** Every CD pipeline that deploys code or changes `app_settings` on an `azurerm_linux_web_app` must end with an explicit `az webapp restart` step. Azure does not reliably guarantee an immediate reload otherwise, and this project deploys directly to the App Service rather than through deployment slots, so there is no slot-swap step to fall back on.
- **Explicit Slot Stickiness (when using deployment slots):** For any `azurerm_linux_web_app` that utilizes deployment slots, you must also define a corresponding `azurerm_app_service_slot_configuration_names` resource. This resource must explicitly list all `app_setting_names` and `connection_string_names` that are "sticky" to their deployment slot and must not swap into production.

## PostgreSQL

- Maintain strict schema integrity. Never modify database shapes or tables without generating an explicit, trackable migration file first. (No PostgreSQL instance exists in this repository yet — this rule takes effect the moment one is introduced.)
