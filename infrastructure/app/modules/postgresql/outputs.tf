output "server_id" {
  value = azurerm_postgresql_flexible_server.this.id
}

output "server_name" {
  value = azurerm_postgresql_flexible_server.this.name
}

output "fqdn" {
  description = "Fully qualified domain name used to connect to the server."
  value       = azurerm_postgresql_flexible_server.this.fqdn
}
