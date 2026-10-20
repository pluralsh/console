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

If an Azure Function workbench tool uses this connection, `Reader` is not enough to read
the function key Plural sends with each call. Without a key, only functions with the
`anonymous` authorization level can be invoked. Assign a custom role on the function app
that adds the key-listing actions:

```terraform
resource "azurerm_role_definition" "plural_function_invoker" {
  name  = "plural-function-invoker"
  scope = "/subscriptions/${var.subscription_id}"

  permissions {
    actions = [
      "Microsoft.Web/sites/functions/read",
      "Microsoft.Web/sites/functions/listsecrets/action",
      "Microsoft.Web/sites/functions/listkeys/action",
      "Microsoft.Web/sites/host/listkeys/action",
    ]
  }

  assignable_scopes = ["/subscriptions/${var.subscription_id}"]
}

resource "azurerm_role_assignment" "plural_function_invoker" {
  scope              = "<function-app-resource-id>"
  role_definition_id = azurerm_role_definition.plural_function_invoker.role_definition_resource_id
  principal_id       = azuread_service_principal.plural_cloud_query.object_id
}
```

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
