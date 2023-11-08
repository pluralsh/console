output "console_msi_client_id" {
  value = azurerm_user_assigned_identity.console.client_id
}

output "console_msi_id" {
  value = azurerm_user_assigned_identity.console.id
}

output "console_sp_client_id" {
  value = azuread_application.app.application_id
}

output "console_sp_client_secret" {
  value = azuread_service_principal_password.app.value
}