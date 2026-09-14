output "automation_account_name" {
  value = azurerm_automation_account.this.name
}

output "runbook_name" {
  value = azurerm_automation_runbook.stop_postgresql.name
}

output "action_group_id" {
  value = azurerm_monitor_action_group.cost_circuit_breaker.id
}

output "budget_name" {
  value = azurerm_consumption_budget_resource_group.postgresql.name
}
