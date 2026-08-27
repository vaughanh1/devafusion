data "azurerm_client_config" "current" {}

module "keyvault" {
  source = "../../modules/keyvault"

  name                = local.key_vault_name
  resource_group_name = azurerm_resource_group.app.name
  location            = var.location

  tenant_id           = data.azurerm_client_config.current.tenant_id
  terraform_object_id = data.azurerm_client_config.current.object_id

  tags = local.common_tags
}

data "azurerm_key_vault_secret" "google_verification_devafusion_com" {
  name         = "google-site-verification-devafusion-com"
  key_vault_id = module.keyvault.key_vault_id

  depends_on = [module.keyvault]
}

data "azurerm_key_vault_secret" "google_verification_devafusion_net" {
  name         = "google-site-verification-devafusion-net"
  key_vault_id = module.keyvault.key_vault_id

  depends_on = [module.keyvault]
}

data "azurerm_key_vault_secret" "google_analytics_ga4_devafusion" {
  name         = "google-analytics-ga4-devafusion"
  key_vault_id = module.keyvault.key_vault_id

  depends_on = [module.keyvault]
}
