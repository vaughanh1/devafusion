variable "email_service_name" {
  description = "Globally unique Email Communication Service resource name."
  type        = string
}

variable "communication_service_name" {
  description = "Globally unique Communication Service resource name (the parent that actually sends mail and exposes the connection string)."
  type        = string
}

variable "resource_group_name" {
  type = string
}

# ADR-0015: "UK" is a genuine, resource-level data-residency guarantee
# for email content at rest - not a latency-optimization region like
# the Resend alternative this replaced. Kept as a variable (rather
# than hardcoded) so a future non-UK environment could still opt in
# explicitly, but the dev environment caller below always passes
# "UK".
variable "data_location" {
  description = "Where the Email/Communication Service stores data at rest. Must be \"UK\" for any environment handling real UK user data (docs/adr/0015's Consequences section)."
  type        = string
  default     = "UK"
}

variable "tags" {
  type = map(string)
}
