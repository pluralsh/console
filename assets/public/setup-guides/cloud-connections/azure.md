# Azure cloud connection setup

Use this guide to fill `Subscription ID`, `Tenant ID`, `Client ID`, and `Client secret`.

## 1) Create a service principal

1. Register an app in Microsoft Entra ID.
2. Create a client secret and copy it immediately.
3. Collect tenant ID, client ID, and subscription ID.

## 2) Assign read-only RBAC roles

For cloud resource inventory/read access:
- Assign built-in `Reader` role at subscription or resource-group scope.

For monitor/log query-heavy scenarios, you can also add:
- `Monitoring Reader`
- `Log Analytics Reader` (or `Log Analytics Data Reader`)

Use smallest possible scope and avoid Contributor/Owner for this integration.

## 3) Fill the cloud connection form

- `Subscription ID`
- `Tenant ID`
- `Client ID`
- `Client secret`
