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
