variable "subscription_id" {
  description = "Azure subscription ID."
  type        = string
}

variable "location" {
  description = "Azure region."
  type        = string
  default     = "uksouth"
}

variable "resource_group_name" {
  description = "Terraform state resource group."
  type        = string
  default     = "rg-devafusion-tfstate-uks"
}

variable "storage_account_name" {
  description = "Terraform state storage account."
  type        = string
  default     = "stdevafusiontfstateuks01"
}

variable "state_container_name" {
  description = "Terraform state blob container."
  type        = string
  default     = "tfstate"
}