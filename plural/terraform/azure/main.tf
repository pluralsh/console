data "azurerm_resource_group" "group" {
  name = var.resource_group
}

data "azurerm_subscription" "current" {}

data "azurerm_kubernetes_cluster" "cluster" {
  name = var.cluster_name
  resource_group_name = var.resource_group
}

resource "kubernetes_namespace" "console" {
  metadata {
    name = var.namespace

    labels = {
      "app.kubernetes.io/managed-by" = "plural"
      "app.plural.sh/name" = "console"
      "platform.plural.sh/sync-target" = "pg"
    }
  }
}

resource "azurerm_user_assigned_identity" "console" {
  resource_group_name = data.azurerm_resource_group.group.name
  location            = data.azurerm_resource_group.group.location

  name = "${var.cluster_name}-console"
}

resource "azurerm_role_assignment" "rg-reader" {
  scope                = data.azurerm_subscription.current.id
  role_definition_name = "Owner"
  principal_id         = azurerm_user_assigned_identity.console.principal_id
}

resource "azurerm_federated_identity_credential" "capz" {
  name                = "${var.console_identity}-federated-credential"
  resource_group_name = data.azurerm_resource_group.group.name
  audience            = ["api://AzureADTokenExchange"]
  issuer              = data.azurerm_kubernetes_cluster.cluster.oidc_issuer_url
  parent_id           = azurerm_user_assigned_identity.console.id
  subject             = "system:serviceaccount:${var.namespace}:console"
}

# Terraform that is executed in console doesn't work with workload identity.
# Service principal auth is used as a temporary workaround.
resource "azuread_application" "app" {
  display_name = "${var.cluster_name}-console"
}

resource "azuread_service_principal" "app" {
  application_id = azuread_application.app.application_id
}

resource "azuread_service_principal_password" "app" {
  service_principal_id = azuread_service_principal.app.id
}

resource "azurerm_role_assignment" "app" {
  scope                = data.azurerm_subscription.current.id
  role_definition_name = "Contributor"
  principal_id         = azuread_service_principal.app.id
}
