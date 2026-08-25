output "app_service_plan_id" {
  value = azurerm_service_plan.this.id
}

output "web_app_id" {
  value = azurerm_linux_web_app.this.id
}

output "web_app_name" {
  value = azurerm_linux_web_app.this.name
}

output "default_hostname" {
  value = azurerm_linux_web_app.this.default_hostname
}

output "custom_domain_verification_id" {
  description = "App Service custom domain verification ID."
  value       = azurerm_linux_web_app.this.custom_domain_verification_id
  sensitive   = true
}
