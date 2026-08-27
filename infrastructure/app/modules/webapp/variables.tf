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

variable "health_check_path" {
  description = "Path pinged by App Service Health check. Null disables the feature."
  type        = string
  default     = null
}

variable "health_check_eviction_time_in_min" {
  description = "Minutes an unhealthy instance is pinged before eviction from the load balancer. Only used when health_check_path is set. Valid range: 2-10."
  type        = number
  default     = 2
}
