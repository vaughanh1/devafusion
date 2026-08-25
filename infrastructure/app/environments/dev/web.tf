module "webapp" {
  source = "../../modules/webapp"

  resource_group_name = azurerm_resource_group.app.name
  location            = var.location

  app_service_plan_name = local.app_service_plan_name
  sku_name              = var.app_service_plan_sku
  node_version          = var.node_version
  web_app_name          = var.web_app_name

  tags = local.common_tags
}
