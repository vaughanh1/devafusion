resource "azurerm_dns_zone" "devafusion_com" {
  name                = local.secondary_domain
  resource_group_name = azurerm_resource_group.app.name

  tags = local.common_tags
}

resource "azurerm_dns_zone" "devafusion_net" {
  name                = local.primary_domain
  resource_group_name = azurerm_resource_group.app.name

  tags = local.common_tags
}

resource "azurerm_dns_zone" "devafusion_co_uk" {
  name                = local.tertiary_domain
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

resource "azurerm_dns_txt_record" "devafusion_co_uk_asuid" {
  name                = "asuid"
  zone_name           = azurerm_dns_zone.devafusion_co_uk.name
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
    value = data.azurerm_key_vault_secret.google_verification_devafusion_com.value
  }
}

resource "azurerm_dns_txt_record" "devafusion_net_google_verification" {
  name                = "@"
  zone_name           = azurerm_dns_zone.devafusion_net.name
  resource_group_name = azurerm_resource_group.app.name
  ttl                 = 3600

  record {
    value = data.azurerm_key_vault_secret.google_verification_devafusion_net.value
  }
}

resource "azurerm_dns_txt_record" "devafusion_co_uk_google_verification" {
  name                = "@"
  zone_name           = azurerm_dns_zone.devafusion_co_uk.name
  resource_group_name = azurerm_resource_group.app.name
  ttl                 = 3600

  record {
    value = data.azurerm_key_vault_secret.google_verification_devafusion_co_uk.value
  }
}

resource "azurerm_dns_txt_record" "devafusion_com_spf" {
  name                = "@"
  zone_name           = azurerm_dns_zone.devafusion_com.name
  resource_group_name = azurerm_resource_group.app.name
  ttl                 = 3600

  record {
    value = "v=spf1 include:spf.protection.outlook.com -all"
  }
}

resource "azurerm_dns_cname_record" "devafusion_com_dkim_selector1" {
  name                = "selector1._domainkey"
  zone_name           = azurerm_dns_zone.devafusion_com.name
  resource_group_name = azurerm_resource_group.app.name
  ttl                 = 3600

  record = "selector1-devafusion-com._domainkey.devafusioncom.onmicrosoft.com"
}

resource "azurerm_dns_cname_record" "devafusion_com_dkim_selector2" {
  name                = "selector2._domainkey"
  zone_name           = azurerm_dns_zone.devafusion_com.name
  resource_group_name = azurerm_resource_group.app.name
  ttl                 = 3600

  record = "selector2-devafusion-com._domainkey.devafusioncom.onmicrosoft.com"
}

resource "azurerm_dns_txt_record" "devafusion_com_dmarc" {
  name                = "_dmarc"
  zone_name           = azurerm_dns_zone.devafusion_com.name
  resource_group_name = azurerm_resource_group.app.name
  ttl                 = 3600

  record {
    value = "v=DMARC1; p=none; rua=mailto:dmarc@devafusion.com"
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

resource "azurerm_dns_a_record" "devafusion_co_uk" {
  name                = "@"
  zone_name           = azurerm_dns_zone.devafusion_co_uk.name
  resource_group_name = azurerm_resource_group.app.name
  ttl                 = 300

  records = [data.dns_a_record_set.webapp.addrs[0]]
}
