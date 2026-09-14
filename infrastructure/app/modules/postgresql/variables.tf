variable "name" {
  description = "Globally unique PostgreSQL Flexible Server name."
  type        = string
}

variable "resource_group_name" {
  type = string
}

variable "location" {
  type = string
}

variable "sku_name" {
  description = "Compute SKU, e.g. B_Standard_B1ms (Burstable), GP_Standard_D2ds_v5 (General Purpose)."
  type        = string
  default     = "B_Standard_B1ms"
}

variable "postgres_version" {
  description = "PostgreSQL major version."
  type        = string
  default     = "16"
}

variable "storage_mb" {
  description = "Provisioned storage in MB. 32768 (32 GiB) is the minimum and default for Burstable."
  type        = number
  default     = 32768
}

variable "backup_retention_days" {
  description = "Automated backup retention window, 7-35 days."
  type        = number
  default     = 7
}

variable "geo_redundant_backup_enabled" {
  description = "Whether backups are geo-redundant. Adds cost; left disabled for the low-traffic dev/early-production tier."
  type        = bool
  default     = false
}

variable "administrator_login" {
  description = "PostgreSQL administrator login name."
  type        = string
  default     = "devafusionadmin"
}

variable "administrator_password" {
  description = "PostgreSQL administrator password, sourced from a Key Vault secret by the caller - never a literal in .tf or .tfvars (root AGENTS.md Zero Hardcoded Secrets, ADR-0004)."
  type        = string
  sensitive   = true
}

variable "zone" {
  description = "Availability zone the server is pinned to. Azure auto-assigns one at creation if left unset in the API call, but changing this attribute afterwards forces a full resource replacement unless done via a high_availability standby-zone swap - so this must be pinned to the real, already-assigned zone once known, never left to drift silently."
  type        = string
  default     = "2"
}

variable "public_network_access_enabled" {
  description = "Whether the server has a public endpoint at all. Firewall rules further restrict which IPs may use it when true."
  type        = bool
  default     = true
}

variable "firewall_rules" {
  description = "Map of firewall rule name to {start_ip_address, end_ip_address}. Deliberately empty by default - callers must name every allowed range explicitly rather than relying on a wide-open default (see module README: never pass 0.0.0.0-255.255.255.255, the Azure-services-wide-open equivalent)."
  type = map(object({
    start_ip_address = string
    end_ip_address   = string
  }))
  default = {}
}

variable "tags" {
  type = map(string)
}
