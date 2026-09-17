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

  # Azure DNS treats every TXT value at a given name as one recordset, so
  # the SPF value must live in this same resource rather than a second
  # azurerm_dns_txt_record at "@" - a duplicate resource collides on the
  # same recordset ID and terraform apply refuses to create it.
  record {
    value = data.azurerm_key_vault_secret.google_verification_devafusion_com.value
  }

  record {
    value = "v=spf1 include:spf.protection.outlook.com -all"
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

# ADR-0015 addendum: Azure Communication Services Email's custom-
# domain verification for devafusion.net (donotreply@devafusion.net,
# module.email) - each record's type/name/value comes straight from
# Azure's own verification_records output, computed once
# azurerm_email_communication_service_domain exists; nothing here is
# guessed or hand-copied from the Portal. Domain ownership TXT and
# SPF/DKIM/DKIM2 verify automatically once these are live in DNS
# (Microsoft's own documented 15-30 minute propagation window, no
# manual "click verify" step). This is entirely independent of
# devafusion.com's separate Microsoft 365 DKIM/DMARC records above -
# different domain, different mail system (M365 mailboxes vs. this
# app's own transactional MFA sender).
#
# CAVEAT (must be verified before merge, not assumed): Azure's own
# documentation examples for verification_records.*.name were not
# conclusively confirmed as fully-qualified (e.g.
# "selector1-azurecomm-prod-net._domainkey.devafusion.net.") vs.
# already-relative-to-zone (e.g. "selector1-azurecomm-prod-net.
# _domainkey") against a real, live Azure Communication Services
# resource - no live subscription was available to check this
# directly. The trimsuffix() calls below assume the fully-qualified
# form (Azure's typical convention for this kind of computed DNS
# value) and strip the zone suffix accordingly. Run `terraform plan`
# against a real Azure subscription with modules/email actually
# applied, inspect the literal .name values azurerm returns, and fix
# this trimsuffix logic if the assumption is wrong, before this is
# ever applied to a real environment.
resource "azurerm_dns_txt_record" "devafusion_net_acs_domain_verification" {
  name                = trimsuffix(module.email.verification_records[0].domain[0].name, ".${local.primary_domain}.")
  zone_name           = azurerm_dns_zone.devafusion_net.name
  resource_group_name = azurerm_resource_group.app.name
  ttl                 = module.email.verification_records[0].domain[0].ttl

  record {
    value = module.email.verification_records[0].domain[0].value
  }
}

resource "azurerm_dns_txt_record" "devafusion_net_acs_spf" {
  name                = trimsuffix(module.email.verification_records[0].spf[0].name, ".${local.primary_domain}.")
  zone_name           = azurerm_dns_zone.devafusion_net.name
  resource_group_name = azurerm_resource_group.app.name
  ttl                 = module.email.verification_records[0].spf[0].ttl

  record {
    value = module.email.verification_records[0].spf[0].value
  }
}

resource "azurerm_dns_cname_record" "devafusion_net_acs_dkim" {
  name                = trimsuffix(module.email.verification_records[0].dkim[0].name, ".${local.primary_domain}.")
  zone_name           = azurerm_dns_zone.devafusion_net.name
  resource_group_name = azurerm_resource_group.app.name
  ttl                 = module.email.verification_records[0].dkim[0].ttl

  record = module.email.verification_records[0].dkim[0].value
}

resource "azurerm_dns_cname_record" "devafusion_net_acs_dkim2" {
  name                = trimsuffix(module.email.verification_records[0].dkim2[0].name, ".${local.primary_domain}.")
  zone_name           = azurerm_dns_zone.devafusion_net.name
  resource_group_name = azurerm_resource_group.app.name
  ttl                 = module.email.verification_records[0].dkim2[0].ttl

  record = module.email.verification_records[0].dkim2[0].value
}

# DMARC is deliberately NOT sourced from verification_records.dmarc -
# Azure's own default DMARC record uses p=none (monitor-only), and
# this zone already has an established DMARC policy pattern for
# devafusion.com (p=none, see that record's own comment) that this
# mirrors for consistency; the actual record value is a literal
# matching that same pattern, not Azure-computed, since ACS's
# verification does not require a specific DMARC policy stringency,
# only that a record exists at _dmarc.
resource "azurerm_dns_txt_record" "devafusion_net_dmarc" {
  name                = "_dmarc"
  zone_name           = azurerm_dns_zone.devafusion_net.name
  resource_group_name = azurerm_resource_group.app.name
  ttl                 = 3600

  record {
    value = "v=DMARC1; p=none; rua=mailto:dmarc@devafusion.net"
  }
}

resource "azurerm_dns_txt_record" "devafusion_net_atproto" {
  name                = "_atproto"
  zone_name           = azurerm_dns_zone.devafusion_net.name
  resource_group_name = azurerm_resource_group.app.name
  ttl                 = 300

  record {
    value = data.azurerm_key_vault_secret.bluesky_verification_devafusion_net.value
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
