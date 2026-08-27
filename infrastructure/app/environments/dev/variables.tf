variable "subscription_id" {
  description = "Azure subscription ID."
  type        = string
  sensitive   = true
}

variable "location" {
  description = "Azure region."
  type        = string
}

variable "product" {
  description = "Product name."
  type        = string
}

variable "environment" {
  description = "Deployment environment."
  type        = string
}

variable "app_service_plan_sku" {
  description = "App Service Plan SKU."
  type        = string
}

variable "node_version" {
  description = "Node.js runtime version."
  type        = string
}

variable "web_app_name" {
  description = "Globally unique Azure Web App name."
  type        = string
}
