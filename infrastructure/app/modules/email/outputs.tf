output "connection_string" {
  description = "Primary connection string for the Communication Service - wired into ACS_EMAIL_CONNECTION_STRING app_settings by the caller."
  value       = azurerm_communication_service.this.primary_connection_string
  sensitive   = true
}

output "sender_address" {
  # mail_from_sender_domain is the custom domain itself once verified
  # (var.custom_domain_name, e.g. "devafusion.net") - the local-part
  # matches azapi_update_resource.donotreply_display_name's own
  # "donotreply" username above, which is also where the "Devafusion"
  # display name is patched onto Azure's auto-provisioned sender
  # username (a resource-level setting, not a per-send SDK
  # parameter).
  description = "The verified custom domain's full MailFrom (P1 envelope sender) address, with a Devafusion display name configured on the sender username resource above - used as-is for ACS_EMAIL_MFA_SENDER_ADDRESS. Fully Terraform-computed, no manual step."
  value       = "donotreply@${azurerm_email_communication_service_domain.this.mail_from_sender_domain}"

  depends_on = [azapi_update_resource.donotreply_display_name]
}

# ADR-0015 addendum: exposed so the caller (environments/dev/email.tf)
# can wire each record straight into azurerm_dns_* resources on the
# real devafusion.net zone - Azure computes these from the domain
# resource above, no manual Portal step to read them.
output "verification_records" {
  description = "DNS verification records (domain ownership TXT, SPF, DKIM, DKIM2, DMARC) required to verify this custom domain - see azurerm_email_communication_service_domain's own documented verification_records attribute."
  value       = azurerm_email_communication_service_domain.this.verification_records
}

