variable "resource_group_name" {
  type = string
}

variable "location" {
  type = string
}

variable "app_service_plan_name" {
  type = string
}

variable "web_app_name" {
  type = string
}

variable "sku_name" {
  type = string
}

variable "node_version" {
  type = string
}

variable "tags" {
  type = map(string)
}

variable "app_settings" {
  description = "App settings applied to the Linux Web App."
  type        = map(string)
  default     = {}
}
