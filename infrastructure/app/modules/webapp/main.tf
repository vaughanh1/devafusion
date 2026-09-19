resource "azurerm_service_plan" "this" {
  name                = var.app_service_plan_name
  resource_group_name = var.resource_group_name
  location            = var.location

  os_type  = "Linux"
  sku_name = var.sku_name

  tags = var.tags
}

resource "azurerm_linux_web_app" "this" {
  name                = var.web_app_name
  resource_group_name = var.resource_group_name
  location            = var.location
  service_plan_id     = azurerm_service_plan.this.id

  https_only = true

  site_config {
    always_on = false

    use_32_bit_worker = false

    application_stack {
      node_version = var.node_version
    }

    app_command_line = "node server.js"

    health_check_path                 = var.health_check_path
    health_check_eviction_time_in_min = var.health_check_path != null ? var.health_check_eviction_time_in_min : null

  }

  # Confirmed as a real, undiagnosable-in-production gap (a 24-byte
  # MFA_ENCRYPTION_KEY caused a genuine 500 on /api/auth/two-factor/enrol
  # with zero server-side visibility - App Service application logging
  # was Off, and Application Insights does not yet support the Node 24
  # LTS runtime this app is pinned to). file_system_level is set to its
  # most permissive value ("Verbose") deliberately: this is a plain
  # Node process writing to stdout/stderr, not a .NET app using
  # ILogger-style severity tracing, so this setting does not filter by
  # this app's own console.error/console.log call sites the way it
  # would for a .NET app - it primarily gates whether the platform
  # captures the container's stdout/stderr at all. A narrower level
  # (Warning/Error) risks silently dropping exactly the console.error
  # output this change exists to capture, for a disk-space savings
  # that retention_in_mb below already bounds independently. Costs
  # nothing beyond that capped local disk usage - no Azure Storage
  # account introduced.
  logs {
    application_logs {
      file_system_level = "Verbose"
    }

    http_logs {
      file_system {
        retention_in_mb   = 35
        retention_in_days = 7
      }
    }
  }

  # ADR-0014: Access Restrictions were evaluated and deliberately NOT
  # added in this slice, for two different reasons:
  # - On the main app: this is a public site with open self-service
  #   registration, so an IP allow/deny list would block legitimate
  #   visitors, not bots - Access Restrictions has no rate-limiting
  #   concept, only allow/deny.
  # - On the SCM/Kudu site: initially considered as a "deny by
  #   default" restriction since it has no legitimate public visitor,
  #   but AzureWebApp@1's zipDeploy method (pipelines/cd/web.yml)
  #   deploys through that exact SCM endpoint - confirmed directly
  #   against Microsoft's own task and Access Restrictions
  #   documentation, neither of which documents a stable IP range or
  #   service tag for Azure DevOps's ephemeral hosted agents (the same
  #   problem already identified for advanced.ipAddress.trustedProxies
  #   above). Denying SCM access with no viable allowlist would break
  #   every future CD deployment, so this was not implemented.

  app_settings = var.app_settings

  tags = var.tags
}


