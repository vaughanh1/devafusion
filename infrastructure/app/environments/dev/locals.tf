locals {
  location_short = "uks"

  resource_group_name   = "rg-${var.product}-${var.environment}-${local.location_short}"
  app_service_plan_name = "asp-${var.product}-${var.environment}-${local.location_short}"

  common_tags = {
    Product     = var.product
    Environment = var.environment
    Owner       = "Devafusion"
    CostCentre  = "Devafusion"
  }
}
