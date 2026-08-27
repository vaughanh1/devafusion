resource "azurerm_dns_zone" "devafusion_com" {
  name                = "devafusion.com"
  resource_group_name = azurerm_resource_group.app.name

  tags = local.common_tags
}

resource "azurerm_dns_zone" "devafusion_net" {
  name                = "devafusion.net"
  resource_group_name = azurerm_resource_group.app.name

  tags = local.common_tags
}

resource "azurerm_dns_mx_record" "devafusion_com" {
  name                = "@"
  zone_name           = azurerm_dns_zone.devafusion_com.name
  resource_group_name = azurerm_resource_group.app.name
  ttl                 = 3600

  record {
    preference = 10
    exchange   = "devafusion-com.mail.protection.outlook.com"
  }
}

resource "azurerm_dns_cname_record" "devafusion_com_autodiscover" {
  name                = "autodiscover"
  zone_name           = azurerm_dns_zone.devafusion_com.name
  resource_group_name = azurerm_resource_group.app.name
  ttl                 = 3600

  record = "autodiscover.outlook.com"
}

resource "azurerm_dns_txt_record" "devafusion_com_asuid" {
  name                = "asuid"
  zone_name           = azurerm_dns_zone.devafusion_com.name
  resource_group_name = azurerm_resource_group.app.name
  ttl                 = 300

  record {
    value = module.webapp.custom_domain_verification_id
  }
}

resource "azurerm_dns_txt_record" "devafusion_net_asuid" {
  name                = "asuid"
  zone_name           = azurerm_dns_zone.devafusion_net.name
  resource_group_name = azurerm_resource_group.app.name
  ttl                 = 300

  record {
    value = module.webapp.custom_domain_verification_id
  }
}

resource "azurerm_dns_txt_record" "devafusion_com_google_verification" {
  name                = "@"
  zone_name           = azurerm_dns_zone.devafusion_com.name
  resource_group_name = azurerm_resource_group.app.name
  ttl                 = 3600

  record {
    value = azurerm_key_vault_secret.google_verification_devafusion_com.value
  }
}

resource "azurerm_dns_txt_record" "devafusion_net_google_verification" {
  name                = "@"
  zone_name           = azurerm_dns_zone.devafusion_net.name
  resource_group_name = azurerm_resource_group.app.name
  ttl                 = 3600

  record {
    value = azurerm_key_vault_secret.google_verification_devafusion_net.value
  }
}

data "dns_a_record_set" "webapp" {
  host = module.webapp.default_hostname
}

resource "azurerm_dns_a_record" "devafusion_com" {
  name                = "@"
  zone_name           = azurerm_dns_zone.devafusion_com.name
  resource_group_name = azurerm_resource_group.app.name
  ttl                 = 300

  records = [data.dns_a_record_set.webapp.addrs[0]]
}

resource "azurerm_dns_a_record" "devafusion_net" {
  name                = "@"
  zone_name           = azurerm_dns_zone.devafusion_net.name
  resource_group_name = azurerm_resource_group.app.name
  ttl                 = 300

  records = [data.dns_a_record_set.webapp.addrs[0]]
}
