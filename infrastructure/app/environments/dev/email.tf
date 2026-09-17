# ADR-0015: Azure Communication Services Email for MFA email-OTP
# dispatch (features/auth/mfa/send-email-otp.ts). data_location = "UK"
# is a genuine, Microsoft-documented resource-level data-residency
# guarantee for email content at rest - see infrastructure/app/
# modules/email/main.tf's own comment for the full rationale and the
# Resend alternative this replaced.
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
