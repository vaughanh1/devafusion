locals {
  location_short = "uks"

  resource_group_name   = "rg-${var.product}-${var.environment}-${local.location_short}"
  app_service_plan_name = "asp-${var.product}-${var.environment}-${local.location_short}"
  key_vault_name        = "kv-${var.product}-${var.environment}-${local.location_short}"

  primary_domain   = "devafusion.com"
  secondary_domain = "devafusion.net"

  common_tags = {
    Product     = var.product
    Environment = var.environment
    Owner       = "Devafusion"
    CostCentre  = "Devafusion"
  }
}
