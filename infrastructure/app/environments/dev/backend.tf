terraform {
  backend "azurerm" {
    resource_group_name  = "rg-devafusion-tfstate-uks"
    storage_account_name = "stdevafusiontfstateuks01"
    container_name       = "tfstate"
    key                  = "dev/app.tfstate"
    use_azuread_auth     = true
  }
}
