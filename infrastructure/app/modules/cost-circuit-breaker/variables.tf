variable "resource_group_name" {
  type = string
}

variable "resource_group_id" {
  description = "Full resource ID of the resource group the budget is scoped to."
  type        = string
}

variable "location" {
  type = string
}

variable "automation_account_name" {
  type = string
}

variable "postgresql_server_name" {
  description = "Name of the PostgreSQL Flexible Server the stop runbook targets."
  type        = string
}

variable "budget_amount" {
  description = "Monthly spend threshold (GBP) for the resource group consumption budget."
  type        = number
  default     = 30
}

variable "budget_notification_emails" {
  description = "Email addresses notified at both the 80% warning and 100% action thresholds."
  type        = list(string)
}

variable "webhook_expiry_time" {
  description = "Expiry timestamp for the budget-trigger webhook (RFC3339). Azure's Automation webhook API rejects an unbounded far-future value (e.g. a 2099 date returns a plain 'Invalid expiry time' 400 with no documented ceiling) - keep this bounded (10 years from creation here) and rotate it well before expiry, as a deliberate, tracked step, not an emergency."
  type        = string
  default     = "2036-12-31T00:00:00Z"
}

variable "tags" {
  type = map(string)
}
