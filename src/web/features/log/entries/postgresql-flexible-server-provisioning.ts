import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "postgresql-flexible-server-provisioning",
  date: "2026-09-14",
  title: "Provision Azure Database for PostgreSQL Flexible Server",
  summary:
    "Added a reusable postgresql Terraform module and wired it into the dev environment as the project's first relational database, following ADR-0010's selection of Flexible Server on the Burstable B_Standard_B1ms tier. Also backfilled ADR-0001 through ADR-0009 for architectural decisions already made in this repository but never formally recorded.",
  tags: ["azure", "terraform", "database", "architecture"],
  decisions: [
    "Follow the existing module pattern (keyvault, webapp): a self-contained infrastructure/app/modules/postgresql module with its own variables/main/outputs, invoked once from environments/dev/postgresql.tf, naming the server psql-devafusion-dev-uks per the existing <type>-<product>-<environment>-<location_short> convention.",
    "The administrator password is read from a Key Vault secret via data \"azurerm_key_vault_secret\", never written by Terraform - the value must be created manually in Key Vault first, per ADR-0004's secret provisioning boundary. A lifecycle.ignore_changes block on administrator_password stops a routine apply from treating an out-of-band credential rotation in Key Vault as configuration drift.",
    "Firewall rules are built dynamically from the web app's own outbound_ip_address_list output rather than a hardcoded IP list or Azure's 'allow all Azure services' checkbox - the database only ever trusts the App Service's real, current egress addresses. A new outbound_ip_address_list output was added to the webapp module to make this possible.",
    "DATABASE_URL is assembled as a connection string app setting from the same Key Vault-sourced password and the module's fqdn output, rather than storing a second, separately-provisioned connection string secret - there is exactly one source of truth for the credential.",
    "Backfilled 9 retroactive ADRs (docs/adr/0001-0009) for decisions this repo already made (App Router/Linux App Service, Terraform-only infrastructure, split web/infra pipelines, the Key Vault secret provisioning boundary, the Hub-and-Spoke AGENTS.md structure, the pre-hydration cookie read, the three-tier testing strategy, the canonical-domain flip, and the one-file-per-log-entry pattern), following the domain-modeling skill's ADR format and three-part test, after discovering none had ever been written despite several meeting the test clearly.",
    "ADR-0010 documents that Microsoft Fabric Mirroring is explicitly unsupported as a source on the Burstable tier (confirmed against Microsoft's own documentation), while direct query access from Power BI, Synapse, and Databricks is fully supported today - deferring Fabric Mirroring to a future dedicated General Purpose read replica rather than silently promising compatibility the tier doesn't have.",
  ],
  milestones: [
    "Added infrastructure/app/modules/postgresql (main.tf, variables.tf, outputs.tf) provisioning azurerm_postgresql_flexible_server and azurerm_postgresql_flexible_server_firewall_rule resources.",
    "Added infrastructure/app/environments/dev/postgresql.tf invoking the module with sku_name defaulted to B_Standard_B1ms, and a postgresql_server_name local.",
    "Added a postgresql-admin-password-devafusion Key Vault secret data source in keyvault.tf, and wired DATABASE_URL into the webapp module's app_settings in web.tf.",
    "Added outbound_ip_address_list output to the webapp module and postgresql_server_name/postgresql_fqdn outputs to the dev environment.",
    "Created docs/adr/ and wrote ADR-0001 through ADR-0010.",
  ],
  validation: [
    "terraform fmt -check -recursive (infrastructure/app/environments/dev) passed clean",
    "terraform validate (infrastructure/app/environments/dev) passed clean",
    "Verified every referenced provider argument (sku_name, storage_mb, administrator_login/password, backup_retention_days, geo_redundant_backup_enabled, firewall rule start/end IP) against the pinned hashicorp/azurerm v4.81.0 provider documentation before writing the module, rather than assuming attribute names.",
  ],
  visibility: "public",
};
