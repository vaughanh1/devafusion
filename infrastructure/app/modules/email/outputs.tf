output "connection_string" {
  description = "Primary connection string for the Communication Service - wired into ACS_EMAIL_CONNECTION_STRING app_settings by the caller."
  value       = azurerm_communication_service.this.primary_connection_string
  sensitive   = true
}

output "sender_address" {
  # mail_from_sender_domain is the custom domain itself once verified
  # (var.custom_domain_name, e.g. "devafusion.net") - the default
  # MailFrom local-part for any CustomerManaged domain is
  # "donotreply" (confirmed against Microsoft's own quickstart
  # example) unless a separate Sender Username resource is
  # configured, which azurerm has no Terraform resource for today
  # (Portal/CLI/PowerShell only) - donotreply@devafusion.net was
  # explicitly accepted as sufficient rather than adding an
  # unsupported-in-Terraform manual step for noreply@.
  description = "The verified custom domain's full MailFrom (P1 envelope sender) address - used as-is for ACS_EMAIL_MFA_SENDER_ADDRESS. Fully Terraform-computed, no manual step."
  value       = "donotreply@${azurerm_email_communication_service_domain.this.mail_from_sender_domain}"
}

# ADR-0015 addendum: exposed so the caller (environments/dev/email.tf)
# can wire each record straight into azurerm_dns_* resources on the
# real devafusion.net zone - Azure computes these from the domain
# resource above, no manual Portal step to read them.
output "verification_records" {
  description = "DNS verification records (domain ownership TXT, SPF, DKIM, DKIM2, DMARC) required to verify this custom domain - see azurerm_email_communication_service_domain's own documented verification_records attribute."
  value       = azurerm_email_communication_service_domain.this.verification_records
}
