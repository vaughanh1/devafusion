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

- **Live instance, tooling-only so far:** the Flexible Server (`docs/adr/0010-relational-database-engine-selection.md`) and its cost circuit breaker are provisioned and live. Drizzle ORM/`drizzle-kit` tooling, a repository-pattern data-access layer, and an identity schema (`docs/adr/0012-better-auth-identity-and-self-hosted-mfa.md`) are built (`src/web/db/`, `src/web/features/log/`, `src/web/features/auth/`), proven against an in-memory PGlite instance and a real local Docker Postgres 16 (`src/web/AGENTS.md` §Local Postgres for Migration Testing) — not yet applied to the live server or wired to any CD step.
- **Maintain strict schema integrity:** never modify `src/web/db/schema.ts` (or any future table definition) without running `npm run db:generate` (`drizzle-kit generate`) to produce a trackable, versioned migration file under `src/web/drizzle/` first. Never hand-edit a generated migration file after the fact, and never modify the live database's shape through any channel other than `npm run db:migrate` (`drizzle-kit migrate`) applying those generated files — this is the PostgreSQL-specific instance of the root Idempotency rule.
- **CD pipeline migration step:** `pipelines/cd/web.yml` has an `ApplyMigration` stage (before the `Web` deploy stage) that detects whether `src/web/drizzle/**` changed, opens a temporary named firewall rule for the CD agent's own IP (Microsoft's own documented pattern for exactly this, via `Azure/postgresql-action`), runs `drizzle-kit migrate`, then always closes that rule again. This stage targets the `devafusion-dev-migrations` environment, which requires a **one-time manual setup step in the Azure DevOps UI** (not expressible in YAML): create that environment and add a manual approval check to it, naming the approvers. The exact pending migration SQL is printed in the *triggering* CI run (`pipelines/ci/web.yml`'s "Preview pending database migration" step) before the approval gate is ever reached, so an approver has something concrete to review first.
- **Extension allowlisting is a separate step from the extension existing upstream:** an extension being present in PostgreSQL itself, or even in Azure's own documented extension-version list, does not mean it is enabled on a given server. Add it to the `azure.extensions` server parameter via `azurerm_postgresql_flexible_server_configuration` (see `infrastructure/app/modules/postgresql/main.tf`'s `citext` entry) *before* any migration that depends on it can run against that real server — sequence the Terraform apply ahead of the migration, not the other way round.
