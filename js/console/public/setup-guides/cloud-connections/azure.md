# Azure cloud connection setup

Use this guide to fill `Subscription ID`, `Tenant ID`, `Client ID`, and `Client secret`.

## 1) Create the Entra application and service principal

The following Terraform creates the application, service principal, and client secret.
Set `subscription_id` and `tenant_id` to the subscription and Entra tenant that Cloud
Query will access.

```terraform
variable "subscription_id" {
  type = string
}

variable "tenant_id" {
  type = string
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
  tenant_id       = var.tenant_id
}

provider "azuread" {
  tenant_id = var.tenant_id
}

resource "azuread_application" "plural_cloud_query" {
  display_name = "plural-cloud-query"
}

resource "azuread_service_principal" "plural_cloud_query" {
  client_id = azuread_application.plural_cloud_query.client_id
}

resource "azuread_application_password" "plural_cloud_query" {
  application_id = azuread_application.plural_cloud_query.id
  display_name   = "plural-cloud-query"
  end_date_relative = "8760h" # one year
}
```

Keep the generated secret in a secret manager; it is only available from Terraform
state and the output shown below.

## 2) Assign read-only RBAC roles

Assign the built-in `Reader` role at subscription scope:

```terraform
resource "azurerm_role_assignment" "plural_cloud_query_reader" {
  scope                = "/subscriptions/${var.subscription_id}"
  role_definition_name = "Reader"
  principal_id         = azuread_service_principal.plural_cloud_query.object_id
}
```

For a smaller scope, replace `scope` with
`/subscriptions/<subscription-id>/resourceGroups/<resource-group-name>`.

If queries include Azure Monitor or Log Analytics data, assign the relevant roles at
the same scope:

```terraform
resource "azurerm_role_assignment" "plural_cloud_query_monitoring_reader" {
  scope                = "/subscriptions/${var.subscription_id}"
  role_definition_name = "Monitoring Reader"
  principal_id         = azuread_service_principal.plural_cloud_query.object_id
}

resource "azurerm_role_assignment" "plural_cloud_query_log_analytics_reader" {
  scope                = "/subscriptions/${var.subscription_id}"
  role_definition_name = "Log Analytics Reader"
  principal_id         = azuread_service_principal.plural_cloud_query.object_id
}
```

Do not grant `Contributor` or `Owner` unless an explicitly configured query requires
it.

## 3) Fill the cloud connection form

- `Subscription ID`: `var.subscription_id`
- `Tenant ID`: `var.tenant_id`
- `Client ID`: `azuread_application.plural_cloud_query.client_id`
- `Client secret`: `azuread_application_password.plural_cloud_query.value`

The following sensitive outputs can be used to populate the form:

```terraform
output "plural_cloud_query_client_id" {
  value = azuread_application.plural_cloud_query.client_id
}

output "plural_cloud_query_client_secret" {
  value     = azuread_application_password.plural_cloud_query.value
  sensitive = true
}
```

Rotate the secret before its expiry and update the connection with the replacement
value.
