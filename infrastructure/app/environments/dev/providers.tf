terraform {
  required_version = ">= 1.9.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }

    dns = {
      source  = "hashicorp/dns"
      version = "~> 3.4"
    }

    azapi = {
      source  = "Azure/azapi"
      version = "~> 2.0"
    }
  }
}

provider "azurerm" {
  features {
    # The Key Vault access policy only grants Get/List/Set/Delete, never Purge.
    # Keeping this false means a resource removal always soft-deletes and stays
    # recoverable, instead of Terraform attempting an immediate hard purge that
    # the policy would reject anyway.
    key_vault {
      purge_soft_delete_on_destroy = false
    }
  }

  subscription_id = var.subscription_id

  resource_provider_registrations = "none"
}

provider "azapi" {}
