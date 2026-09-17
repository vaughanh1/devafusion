output "connection_string" {
  description = "Primary connection string for the Communication Service - wired into ACS_EMAIL_CONNECTION_STRING app_settings by the caller."
  value       = azurerm_communication_service.this.primary_connection_string
  sensitive   = true
}

output "sender_address" {
  # mail_from_sender_domain exposes only the domain portion
  # (<guid>.azurecomm.net) - Azure Managed Domain always uses the
  # fixed "donotreply" local-part (confirmed directly against
  # Microsoft's own quickstart example), so the full address is
  # built here rather than left for the caller to guess.
  description = "The Azure-managed domain's full MailFrom (P1 envelope sender) address - used as-is for ACS_EMAIL_MFA_SENDER_ADDRESS. Fully Terraform-computed, no manual step."
  value       = "donotreply@${azurerm_email_communication_service_domain.this.mail_from_sender_domain}"
}
