terraform {
  required_version = ">= 0.13"
  required_providers {
    azurerm = "= 2.33.0"
  }

  backend "remote" {
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
  allow_blob_public_access = true
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
  allow_blob_public_access = true
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
  allow_blob_public_access = true
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
