terraform {
  required_version = "~> 1.2.5"
  required_providers {
    azurerm = "~> 3.0"
  }
  cloud {
    organization = "geirsagberg"

    workspaces {
      name = "github-deploy-center"
    }
  }
}

provider "azurerm" {
  subscription_id = "0d60de30-59ab-484b-b845-244c39b366ce"
  features {}
}

resource "azurerm_resource_group" "github_deploy_center" {
  name     = "github-deploy-center"
  location = "Norway East"
}

resource "azurerm_storage_account" "githubdeploy_dev" {
  min_tls_version          = "TLS1_2"
  name                     = "githubdeploydev"
  resource_group_name      = azurerm_resource_group.github_deploy_center.name
  location                 = azurerm_resource_group.github_deploy_center.location
  account_tier             = "Standard"
  account_replication_type = "RAGRS"
  tags = {
    "environment" = "dev"
  }
  static_website {
    index_document     = "index.html"
    error_404_document = "index.html"
  }
}

resource "azurerm_storage_account" "githubdeploy_test" {
  min_tls_version          = "TLS1_2"
  name                     = "githubdeploytest"
  resource_group_name      = azurerm_resource_group.github_deploy_center.name
  location                 = azurerm_resource_group.github_deploy_center.location
  account_tier             = "Standard"
  account_replication_type = "RAGRS"
  tags = {
    "environment" = "test"
  }
  static_website {
    index_document     = "index.html"
    error_404_document = "index.html"
  }
}

resource "azurerm_storage_account" "githubdeploy_prod" {
  min_tls_version          = "TLS1_2"
  name                     = "githubdeploy"
  resource_group_name      = azurerm_resource_group.github_deploy_center.name
  location                 = azurerm_resource_group.github_deploy_center.location
  account_tier             = "Standard"
  account_replication_type = "RAGRS"
  tags = {
    "environment" = "prod"
  }
  static_website {
    index_document     = "index.html"
    error_404_document = "index.html"
  }
}
