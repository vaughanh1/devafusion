locals {
  location_short = "uks"

  resource_group_name   = "rg-${var.product}-${var.environment}-${local.location_short}"
  app_service_plan_name = "asp-${var.product}-${var.environment}-${local.location_short}"
  key_vault_name        = "kv-${var.product}-${var.environment}-${local.location_short}"

  primary_domain   = "devafusion.net"
  secondary_domain = "devafusion.com"
  tertiary_domain  = "devafusion.co.uk"

  common_tags = {
    Product     = var.product
    Environment = var.environment
    Owner       = "Devafusion"
    CostCentre  = "Devafusion"
  }
}
