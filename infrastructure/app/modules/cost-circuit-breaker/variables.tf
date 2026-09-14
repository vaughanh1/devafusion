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

variable "tags" {
  type = map(string)
}
