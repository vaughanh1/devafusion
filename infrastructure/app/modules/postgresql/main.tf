# ADR-0010: Azure Database for PostgreSQL Flexible Server, Burstable B1ms by
# default. See docs/adr/0010-relational-database-engine-selection.md for the
# full rationale, considered alternatives, and documented consequences
# (Fabric Mirroring is not supported on this tier; direct PowerBI/Synapse/
# Databricks query access is).
resource "azurerm_postgresql_flexible_server" "this" {
  name                = var.name
  resource_group_name = var.resource_group_name
  location            = var.location

  version = var.postgres_version

  administrator_login    = var.administrator_login
  administrator_password = var.administrator_password

  storage_mb = var.storage_mb
  sku_name   = var.sku_name
  zone       = var.zone

  backup_retention_days        = var.backup_retention_days
  geo_redundant_backup_enabled = var.geo_redundant_backup_enabled

  public_network_access_enabled = var.public_network_access_enabled

  tags = var.tags

  lifecycle {
    # The admin password is read from Key Vault by the caller and may be
    # rotated there independently of a Terraform apply; do not force a
    # replacement/diff purely because the value in state differs from a
    # freshly-read secret unless a real rotation is intended.
    ignore_changes = [
      administrator_password,
    ]
  }
}

# Named, explicit firewall rules only - see variables.tf's firewall_rules
# description. No rule here ever defaults to the Azure-wide-open
# 0.0.0.0-255.255.255.255 equivalent; every range must be named by the
# caller (infrastructure/AGENTS.md, ADR-0010 Consequences).
resource "azurerm_postgresql_flexible_server_firewall_rule" "this" {
  for_each = var.firewall_rules

  name             = each.key
  server_id        = azurerm_postgresql_flexible_server.this.id
  start_ip_address = each.value.start_ip_address
  end_ip_address   = each.value.end_ip_address
}
