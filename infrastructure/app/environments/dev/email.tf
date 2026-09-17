# ADR-0015: Azure Communication Services Email for MFA email-OTP
# dispatch (features/auth/mfa/send-email-otp.ts). data_location = "UK"
# is a genuine, Microsoft-documented resource-level data-residency
# guarantee for email content at rest - see infrastructure/app/
# modules/email/main.tf's own comment for the full rationale and the
# Resend alternative this replaced.
#
# Zero conflict with the Microsoft 365 Business mailbox: that mailbox
# is provisioned on devafusion.com (dns.tf's MX/autodiscover/DKIM
# selector1/selector2/DMARC records, all scoped to
# azurerm_dns_zone.devafusion_com), a completely separate DNS zone
# from this module's custom_domain_name (devafusion.net,
# azurerm_dns_zone.devafusion_net). SPF, DKIM, and DMARC are all
# scoped per-domain, not per-tenant/per-subscription, so
# devafusion.net's own SPF/DKIM/DMARC records (wired in dns.tf below)
# neither read nor overwrite anything belonging to the
# devafusion.com M365 mailbox - the two domains' mail authentication
# records are entirely independent.
module "email" {
  source = "../../modules/email"

  email_service_name         = local.email_service_name
  communication_service_name = local.communication_service_name
  resource_group_name        = azurerm_resource_group.app.name
  data_location               = "UK"
  # ADR-0015 addendum: donotreply@devafusion.net (primary_domain) - a
  # real, brand-trusted sender, explicitly chosen over the
  # Azure-managed *.azurecomm.net default.
  custom_domain_name         = local.primary_domain

  tags = local.common_tags
}
