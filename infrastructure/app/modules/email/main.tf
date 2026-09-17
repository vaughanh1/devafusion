# ADR-0015: Azure Communication Services Email for the MFA email-OTP
# factor (features/auth/mfa/send-email-otp.ts) - replaces an earlier
# Resend-based design rejected on UK GDPR data-sovereignty grounds:
# even Resend's nearest-to-UK region is a latency-optimization choice
# only, not a data-residency guarantee, and email content is stored
# in the US regardless. data_location is a genuine, Microsoft-
# documented resource-level guarantee ("the system processes email
# message content in real-time, using the resource's Data Location
# specified by you during resource provisioning") - a first-party
# Azure service already inside this project's own tenant, no new
# vendor or DPA to review.
resource "azurerm_email_communication_service" "this" {
  name                = var.email_service_name
  resource_group_name = var.resource_group_name
  data_location       = var.data_location

  tags = var.tags
}

# Azure-managed domain (*.azurecomm.net) - no external DNS
# verification step required, unlike a custom domain, which would
# need SPF/DKIM/DMARC TXT records on a real devafusion.* zone. Chosen
# deliberately for this slice: an MFA OTP email's deliverability bar
# (reaching the user's own inbox, checked once per login) is lower
# than a marketing/transactional-brand email's, and avoiding a custom
# domain here means zero manual DNS steps - the entire chain from
# here down is Terraform-computed, with no manual Key Vault step at
# all (contrast with every credential-shaped secret elsewhere in this
# project, per ADR-0004).
resource "azurerm_email_communication_service_domain" "this" {
  name             = "AzureManagedDomain"
  email_service_id = azurerm_email_communication_service.this.id

  domain_management = "AzureManaged"

  # UK GDPR Article 5(1)(c) / PECR: an MFA OTP email has no legitimate
  # marketing/analytics purpose - explicit false here, matching this
  # resource's own default, so the invariant is visible in code
  # rather than relying on the default alone.
  user_engagement_tracking_enabled = false

  tags = var.tags
}

# The Communication Service resource is the parent that actually
# sends mail and exposes primary_connection_string - a Terraform-
# computed attribute of a resource Terraform itself provisions, not a
# human-invented secret value pasted into Key Vault. This is a
# different case from every ADR-0004 "sanctioned manual step" secret
# elsewhere in this project (a database admin password, a Turnstile
# key) - there is nothing for a human to create here at all.
resource "azurerm_communication_service" "this" {
  name                = var.communication_service_name
  resource_group_name = var.resource_group_name
  data_location       = var.data_location

  tags = var.tags
}

resource "azurerm_communication_service_email_domain_association" "this" {
  communication_service_id = azurerm_communication_service.this.id
  email_service_domain_id  = azurerm_email_communication_service_domain.this.id
}
