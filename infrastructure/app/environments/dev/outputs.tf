output "resource_group_name" {
  value = azurerm_resource_group.app.name
}

output "app_service_plan_name" {
  value = module.webapp.app_service_plan_id
}

output "web_app_name" {
  value = module.webapp.web_app_name
}

output "default_hostname" {
  value = module.webapp.default_hostname
}

output "devafusion_com_name_servers" {
  description = "Azure DNS name servers for devafusion.com."
  value       = azurerm_dns_zone.devafusion_com.name_servers
}

output "devafusion_net_name_servers" {
  description = "Azure DNS name servers for devafusion.net."
  value       = azurerm_dns_zone.devafusion_net.name_servers
}
