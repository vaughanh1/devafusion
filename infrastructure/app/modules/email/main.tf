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

# ADR-0015 addendum: CustomerManaged, not AzureManagedDomain - the
# product decision is that MFA emails must come from
# noreply@devafusion.net, a real, brand-trusted sender, not a
# *.azurecomm.net address. This requires DNS verification (the
# caller wires verification_records below into azurerm_dns_* records
# on the real devafusion.net zone, the same zone already carrying
# devafusion.com's separate Microsoft 365 DKIM/DMARC records for
# human mailboxes) - a real DNS propagation delay (15-30 minutes,
# Microsoft's own documented window) applies before Azure finishes
# verifying, but no manual "click verify" step: Azure polls DNS
# automatically once the records are live.
resource "azurerm_email_communication_service_domain" "this" {
  name             = var.custom_domain_name
  email_service_id = azurerm_email_communication_service.this.id

  domain_management = "CustomerManaged"

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

# Gives the sender a real, friendly "From" display name ("Devafusion")
# rather than a bare address - confirmed this resource genuinely
# exists in the azurerm provider (an earlier claim that it didn't was
# wrong and is corrected here, verified directly against the
# provider's own registry docs). name is the MailFrom local-part
# ("donotreply", matching the domain's own default local-part rather
# than introducing a second address to verify) - display_name is set
# once here, at the resource level, not per-send in the SDK; the SDK
# call in send-email-otp.ts still only passes the plain address
# string, and Azure attaches this display name automatically based on
# which verified sender address is used.
resource "azurerm_email_communication_service_domain_sender_username" "donotreply" {
  name                    = "donotreply"
  email_service_domain_id = azurerm_email_communication_service_domain.this.id
  display_name            = "Devafusion"
}
