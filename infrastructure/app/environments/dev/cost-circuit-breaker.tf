# ADR-0010 "cost circuit breaker" consequence. See
# docs/adr/0010-relational-database-engine-selection.md and
# infrastructure/app/modules/cost-circuit-breaker/.
module "postgresql_cost_circuit_breaker" {
  source = "../../modules/cost-circuit-breaker"

  resource_group_name = azurerm_resource_group.app.name
  resource_group_id   = azurerm_resource_group.app.id
  location            = var.location

  automation_account_name = local.automation_account_name
  postgresql_server_name  = module.postgresql.server_name

  budget_amount              = 30
  budget_notification_emails = var.budget_notification_emails

  tags = local.common_tags
}
