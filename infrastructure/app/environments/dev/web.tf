module "webapp" {
  source = "../../modules/webapp"

  resource_group_name = azurerm_resource_group.app.name
  location            = var.location

  app_service_plan_name = local.app_service_plan_name
  sku_name              = var.app_service_plan_sku
  node_version          = var.node_version
  web_app_name          = var.web_app_name

  health_check_path                 = "/api/health"
  health_check_eviction_time_in_min = 2

  app_settings = {
    NEXT_PUBLIC_GA_ID = data.azurerm_key_vault_secret.google_analytics_ga4_devafusion.value
  }

  tags = local.common_tags
}

resource "azurerm_app_service_custom_hostname_binding" "com" {
  hostname            = azurerm_dns_zone.devafusion_com.name
  app_service_name    = module.webapp.web_app_name
  resource_group_name = azurerm_resource_group.app.name

  depends_on = [
    azurerm_dns_txt_record.devafusion_com_asuid
  ]

  lifecycle {
    ignore_changes = [
      ssl_state,
      thumbprint
    ]
  }
}

resource "azurerm_app_service_custom_hostname_binding" "net" {
  hostname            = azurerm_dns_zone.devafusion_net.name
  app_service_name    = module.webapp.web_app_name
  resource_group_name = azurerm_resource_group.app.name

  depends_on = [
    azurerm_dns_txt_record.devafusion_net_asuid
  ]

  lifecycle {
    ignore_changes = [
      ssl_state,
      thumbprint
    ]
  }
}

resource "azurerm_app_service_custom_hostname_binding" "co_uk" {
  hostname            = azurerm_dns_zone.devafusion_co_uk.name
  app_service_name    = module.webapp.web_app_name
  resource_group_name = azurerm_resource_group.app.name

  depends_on = [
    azurerm_dns_txt_record.devafusion_co_uk_asuid
  ]

  lifecycle {
    ignore_changes = [
      ssl_state,
      thumbprint
    ]
  }
}

resource "azurerm_app_service_managed_certificate" "com" {
  custom_hostname_binding_id = azurerm_app_service_custom_hostname_binding.com.id
}

resource "azurerm_app_service_managed_certificate" "net" {
  custom_hostname_binding_id = azurerm_app_service_custom_hostname_binding.net.id
}

resource "azurerm_app_service_managed_certificate" "co_uk" {
  custom_hostname_binding_id = azurerm_app_service_custom_hostname_binding.co_uk.id
}

resource "azurerm_app_service_certificate_binding" "com" {
  hostname_binding_id = azurerm_app_service_custom_hostname_binding.com.id
  certificate_id      = azurerm_app_service_managed_certificate.com.id
  ssl_state           = "SniEnabled"
}

resource "azurerm_app_service_certificate_binding" "net" {
  hostname_binding_id = azurerm_app_service_custom_hostname_binding.net.id
  certificate_id      = azurerm_app_service_managed_certificate.net.id
  ssl_state           = "SniEnabled"
}

resource "azurerm_app_service_certificate_binding" "co_uk" {
  hostname_binding_id = azurerm_app_service_custom_hostname_binding.co_uk.id
  certificate_id      = azurerm_app_service_managed_certificate.co_uk.id
  ssl_state           = "SniEnabled"
}
