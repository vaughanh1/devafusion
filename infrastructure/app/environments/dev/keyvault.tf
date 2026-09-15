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

data "azurerm_key_vault_secret" "google_verification_devafusion_co_uk" {
  name         = "google-site-verification-devafusion-co-uk"
  key_vault_id = module.keyvault.key_vault_id

  depends_on = [module.keyvault]
}

data "azurerm_key_vault_secret" "google_analytics_ga4_devafusion" {
  name         = "google-analytics-ga4-devafusion"
  key_vault_id = module.keyvault.key_vault_id

  depends_on = [module.keyvault]
}

# ADR-0004 / ADR-0010: this secret's value is created manually in Key
# Vault as the one sanctioned manual step - Terraform only ever reads it
# here, never writes it, so it can never be the thing that triggers a
# purge/destroy of a live credential.
data "azurerm_key_vault_secret" "postgresql_admin_password" {
  name         = "postgresql-admin-password-devafusion"
  key_vault_id = module.keyvault.key_vault_id

  depends_on = [module.keyvault]
}

# ADR-0012: symmetric key for application-layer envelope encryption of
# user_security.two_factor_secret - a base64-encoded 32-byte value
# (openssl rand -base64 32), created manually in Key Vault per the same
# sanctioned-manual-step rule as every other secret here. Terraform only
# ever reads it, never writes it (ADR-0004).
data "azurerm_key_vault_secret" "mfa_encryption_key" {
  name         = "mfa-encryption-key-devafusion"
  key_vault_id = module.keyvault.key_vault_id

  depends_on = [module.keyvault]
}

# ADR-0012: Better Auth's own session/cookie signing secret (>= 32
# characters, high entropy - openssl rand -base64 32), same manual-step
# and read-only-from-Terraform pattern as every other secret above.
data "azurerm_key_vault_secret" "better_auth_secret" {
  name         = "better-auth-secret-devafusion"
  key_vault_id = module.keyvault.key_vault_id

  depends_on = [module.keyvault]
}
