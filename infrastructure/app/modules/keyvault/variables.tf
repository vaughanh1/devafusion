variable "name" {
  description = "Globally unique Key Vault name."
  type        = string
}

variable "resource_group_name" {
  type = string
}

variable "location" {
  type = string
}

variable "tenant_id" {
  description = "Azure AD tenant ID used for the vault and its access policies."
  type        = string
}

variable "terraform_object_id" {
  description = "Object ID of the identity Terraform runs as; granted secret read/write access."
  type        = string
}

variable "sku_name" {
  type    = string
  default = "standard"
}

variable "soft_delete_retention_days" {
  type    = number
  default = 7
}

variable "purge_protection_enabled" {
  type    = bool
  default = false
}

variable "tags" {
  type = map(string)
}
