# azapi_update_resource.donotreply_display_name below requires the
# azapi provider - declared explicitly here (this module has no
# providers.tf of its own) because a module without its own
# required_providers block for a given provider resolves that
# provider's source ambiguously rather than inheriting the root's
# Azure/azapi choice (confirmed directly: terraform init resolved
# hashicorp/azapi, a different, non-existent publisher, instead of
# the root providers.tf's Azure/azapi, and failed with "does not have
# a provider named registry.terraform.io/hashicorp/azapi").
terraform {
  required_providers {
    azapi = {
      source = "Azure/azapi"
    }
  }
}

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
# rather than a bare address. name is the MailFrom local-part
# ("donotreply", matching the domain's own default local-part rather
# than introducing a second address to verify) - display_name is set
# once here, not per-send in the SDK; the SDK call in
# send-email-otp.ts still only passes the plain address string, and
# Azure attaches this display name automatically based on which
# verified sender address is used.
#
# Deliberately azapi_update_resource, NOT the azurerm_email_
# communication_service_domain_sender_username resource (which does
# genuinely exist in the azurerm provider - an earlier claim that it
# didn't was wrong). Confirmed directly against Microsoft's own docs
# (Add custom verified email domains): Azure auto-provisions a
# default "DoNotReply" sender username the moment a CustomerManaged
# domain exists - this is NOT a resource Terraform ever "creates"
# from a blank slate, it always already exists in Azure by the time
# this resource block runs, on every environment, every time,
# including its very first apply. A plain resource block therefore
# always fails with "a resource with this ID already exists"
# (confirmed directly in a real failed apply run). A native Terraform
# import block was tried next, but that requires its id argument to
# be known at plan time (confirmed directly against a real Terraform
# GitHub issue: "the import block \"id\" argument depends on resource
# attributes that cannot be determined until apply" is a real error)
# - azurerm_email_communication_service_domain.this.id is NOT known
# at plan time on a genuinely fresh environment's first apply, so
# that import block would have broken exactly the case it was meant
# to fix. azapi_update_resource never creates or checks existence at
# all - it only ever issues a PATCH against resource_id, which is
# free to be unknown at plan time like any other resource attribute,
# and its delete is a no-op that leaves the underlying Azure resource
# untouched (confirmed directly against the azapi provider's own
# docs) - exactly matching the reality that Terraform doesn't own
# this resource's create/delete lifecycle, only the display_name
# field on top of what Azure already auto-provisions. This also means
# manually deleting the sender username in the Portal is harmless:
# Azure simply re-auto-provisions the default DoNotReply the next
# time the domain is touched, and this resource's next apply patches
# display_name back onto it.
resource "azapi_update_resource" "donotreply_display_name" {
  type        = "Microsoft.Communication/emailServices/domains/senderUsernames@2023-04-01"
  resource_id = "${azurerm_email_communication_service_domain.this.id}/senderUsernames/donotreply"

  body = {
    properties = {
      username    = "donotreply"
      displayName = "Devafusion"
    }
  }
}
