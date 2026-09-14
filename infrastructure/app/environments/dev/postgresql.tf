# ADR-0010: Azure Database for PostgreSQL Flexible Server, Burstable
# B_Standard_B1ms. See docs/adr/0010-relational-database-engine-selection.md.
module "postgresql" {
  source = "../../modules/postgresql"

  name                = local.postgresql_server_name
  resource_group_name = azurerm_resource_group.app.name
  location            = var.location

  administrator_login    = "devafusionadmin"
  administrator_password = data.azurerm_key_vault_secret.postgresql_admin_password.value

  # Each App Service outbound IP is named explicitly - never a wide-open
  # 0.0.0.0-255.255.255.255 rule (ADR-0010 Consequences, infrastructure/
  # AGENTS.md). The web app's outbound IP list is only known after it is
  # created, so this firewall module is deliberately kept App Service-only
  # for now; a personal admin IP can be added the same way once needed.
  firewall_rules = {
    for idx, ip in module.webapp.outbound_ip_address_list :
    "web-app-outbound-${idx}" => {
      start_ip_address = ip
      end_ip_address   = ip
    }
  }

  tags = local.common_tags
}
