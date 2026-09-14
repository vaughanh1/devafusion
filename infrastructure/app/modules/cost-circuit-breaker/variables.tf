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
  description = "Expiry timestamp for the budget-trigger webhook (RFC3339). Azure's Automation webhook API silently caps this at roughly 10 years from creation with no documented ceiling anywhere in the REST reference - verified empirically (2027/2028/2031/2033/2035 all succeeded, 2036 and 2099 both returned a plain 'Invalid expiry time' 400). Kept to 9 years here, comfortably inside the real limit, and must be rotated well before expiry as a deliberate, tracked step, not an emergency."
  type        = string
  default     = "2035-09-14T00:00:00Z"
}

variable "tags" {
  type = map(string)
}
