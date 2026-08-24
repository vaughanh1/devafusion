resource "azurerm_resource_group" "app" {
  name     = local.resource_group_name
  location = var.location

  tags = merge(
    local.common_tags,
    {
      Purpose = "Devafusion Web Application"
    }
  )
}

module "webapp" {
  source = "../../modules/webapp"

  resource_group_name   = azurerm_resource_group.app.name
  location              = azurerm_resource_group.app.location
  app_service_plan_name = local.app_service_plan_name
  web_app_name          = var.web_app_name
  sku_name              = var.app_service_plan_sku
  node_version          = var.node_version
  tags                  = local.common_tags
}
