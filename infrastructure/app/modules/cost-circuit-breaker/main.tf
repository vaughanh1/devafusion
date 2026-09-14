# ADR-0010 "cost circuit breaker" consequence: Azure Budget -> Action Group
# -> Automation Runbook, auto-stopping the PostgreSQL Flexible Server at a
# defined spend threshold. Everything in this module stays within Azure's
# free tier (Free-SKU Automation Account, Action Groups, and Consumption
# Budgets are all free) - see docs/adr/0010-relational-database-engine-selection.md.

resource "azurerm_automation_account" "this" {
  name                = var.automation_account_name
  resource_group_name = var.resource_group_name
  location            = var.location

  sku_name = "Free"

  identity {
    type = "SystemAssigned"
  }

  tags = var.tags
}

# Content lives in-repo as a plain, reviewable .ps1 file rather than an
# external URL (publish_content_link.uri) or Azure Automation's Source
# Control Integration - both would introduce a dependency outside this
# project's existing Terraform-only deployment model.
data "local_file" "stop_postgresql_runbook" {
  filename = "${path.module}/runbooks/stop-postgresql.ps1"
}

resource "azurerm_automation_runbook" "stop_postgresql" {
  name                    = "stop-postgresql-flexible-server"
  resource_group_name     = var.resource_group_name
  location                = var.location
  automation_account_name = azurerm_automation_account.this.name

  runbook_type = "PowerShell"
  log_verbose  = true
  log_progress = true
  description  = "Stops the PostgreSQL Flexible Server when the resource group's consumption budget reaches its 100% actual-spend threshold."

  content = data.local_file.stop_postgresql_runbook.content

  tags = var.tags
}

# Authenticates as the Automation Account's own system-assigned managed
# identity (Connect-AzAccount -Identity in the runbook) - it needs
# Contributor-equivalent rights on the PostgreSQL server to stop it.
resource "azurerm_role_assignment" "automation_can_stop_postgresql" {
  scope                = "${var.resource_group_id}/providers/Microsoft.DBforPostgreSQL/flexibleServers/${var.postgresql_server_name}"
  role_definition_name = "Contributor"
  principal_id         = azurerm_automation_account.this.identity[0].principal_id
}

# Webhooks are the documented mechanism for an Action Group to invoke a
# specific Runbook with fixed parameters. Azure's webhook API rejects an
# expiry_time set too far in the future (an unbounded value like a
# 2099 date returns a plain "Invalid expiry time" 400 with no documented
# ceiling given) - expiry_time is a var so the concrete date lives in the
# environment's .tfvars, not hardcoded here, and rotating it well before
# expiry is a deliberate, tracked operational task, not an accident.
resource "azurerm_automation_webhook" "stop_postgresql" {
  name                    = "stop-postgresql-budget-trigger"
  resource_group_name     = var.resource_group_name
  automation_account_name = azurerm_automation_account.this.name
  runbook_name            = azurerm_automation_runbook.stop_postgresql.name
  expiry_time             = var.webhook_expiry_time
  enabled                 = true

  parameters = {
    ResourceGroupName = var.resource_group_name
    ServerName        = var.postgresql_server_name
  }
}

resource "azurerm_monitor_action_group" "cost_circuit_breaker" {
  name                = "ag-postgresql-cost-circuit-breaker"
  resource_group_name = var.resource_group_name
  short_name          = "pgcostbrk"

  automation_runbook_receiver {
    name                    = "stop-postgresql"
    automation_account_id   = azurerm_automation_account.this.id
    runbook_name            = azurerm_automation_runbook.stop_postgresql.name
    webhook_resource_id     = azurerm_automation_webhook.stop_postgresql.id
    service_uri             = azurerm_automation_webhook.stop_postgresql.uri
    is_global_runbook       = true
    use_common_alert_schema = true
  }

  tags = var.tags
}

# Warns at 80% actual spend (email only, no action) and triggers the
# runbook at 100% actual spend - the same two-threshold shape Microsoft's
# own documented budget-automation reference architecture uses.
resource "azurerm_consumption_budget_resource_group" "postgresql" {
  name              = "budget-postgresql-cost-circuit-breaker"
  resource_group_id = var.resource_group_id

  amount     = var.budget_amount
  time_grain = "Monthly"

  time_period {
    start_date = "2026-09-01T00:00:00Z"
  }

  notification {
    enabled        = true
    operator       = "GreaterThanOrEqualTo"
    threshold      = 80
    threshold_type = "Actual"

    contact_emails = var.budget_notification_emails
  }

  notification {
    enabled        = true
    operator       = "GreaterThanOrEqualTo"
    threshold      = 100
    threshold_type = "Actual"

    contact_emails = var.budget_notification_emails
    contact_groups = [azurerm_monitor_action_group.cost_circuit_breaker.id]
  }
}
