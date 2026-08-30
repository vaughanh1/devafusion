resource "azapi_resource" "devafusion_com_domain" {
  type      = "Microsoft.DomainRegistration/domains@2024-11-01"
  name      = azurerm_dns_zone.devafusion_com.name
  parent_id = azurerm_resource_group.app.id

  schema_validation_enabled = false

  tags = local.common_tags

  body = {
    properties = {
      dnsType   = "AzureDns"
      autoRenew = true
      privacy   = true
      dnsZoneId = azurerm_dns_zone.devafusion_com.id
    }
  }
}

resource "azapi_resource" "devafusion_net_domain" {
  type      = "Microsoft.DomainRegistration/domains@2024-11-01"
  name      = azurerm_dns_zone.devafusion_net.name
  parent_id = azurerm_resource_group.app.id

  schema_validation_enabled = false

  tags = local.common_tags

  body = {
    properties = {
      dnsType   = "AzureDns"
      autoRenew = true
      privacy   = true
      dnsZoneId = azurerm_dns_zone.devafusion_net.id
    }
  }
}

resource "azapi_resource" "devafusion_co_uk_domain" {
  type      = "Microsoft.DomainRegistration/domains@2024-11-01"
  name      = azurerm_dns_zone.devafusion_co_uk.name
  parent_id = azurerm_resource_group.app.id

  schema_validation_enabled = false

  tags = local.common_tags

  body = {
    properties = {
      dnsType   = "AzureDns"
      autoRenew = true
      # Nominet, the .uk/.co.uk registry, does not support WHOIS privacy
      # protection - the registration API rejects privacy = true for this
      # TLD with a 400 ("The parameter privacy has an invalid value.").
      privacy   = false
      dnsZoneId = azurerm_dns_zone.devafusion_co_uk.id
    }
  }
}
