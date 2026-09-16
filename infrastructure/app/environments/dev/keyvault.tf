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

data "azurerm_key_vault_secret" "bluesky_verification_devafusion_net" {
  name         = "bluesky-site-verification-devafusion-net"
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

# ADR-0014: Cloudflare Turnstile's server-side secret key, used by
# auth.ts's captcha plugin to call Turnstile's /siteverify. Manually
# provisioned in Key Vault (ADR-0004's sanctioned manual step, same
# pattern as every other secret here) after registering a free
# Cloudflare account and Turnstile widget for this domain - Terraform
# only ever reads it.
data "azurerm_key_vault_secret" "turnstile_secret_key" {
  name         = "turnstile-secret-key-devafusion"
  key_vault_id = module.keyvault.key_vault_id

  depends_on = [module.keyvault]
}

# Turnstile's sitekey is not itself sensitive (it is inlined into the
# client bundle via NEXT_PUBLIC_TURNSTILE_SITE_KEY in web.tf), but is
# still stored in Key Vault rather than a plain .tfvars literal since
# it is generated as a pair with the secret key above when the widget
# is registered in the Cloudflare dashboard - keeping both in the same
# place avoids the pair drifting out of sync across two different
# provisioning locations.
data "azurerm_key_vault_secret" "turnstile_site_key" {
  name         = "turnstile-site-key-devafusion"
  key_vault_id = module.keyvault.key_vault_id

  depends_on = [module.keyvault]
}

# ADR-0014: HMAC key signing the stateless form-timing token
# (src/web/features/auth/form-timing-token.ts) - a high-entropy random
# value (e.g. openssl rand -base64 32), same manual-provisioning
# pattern as every other secret here. Terraform only ever reads it.
data "azurerm_key_vault_secret" "form_timing_token_secret" {
  name         = "form-timing-token-secret-devafusion"
  key_vault_id = module.keyvault.key_vault_id

  depends_on = [module.keyvault]
}
