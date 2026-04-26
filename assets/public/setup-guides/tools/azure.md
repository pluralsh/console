# Azure Monitor tool setup

Use this guide to fill `Subscription ID`, `Tenant ID`, `Client ID`, and `Client secret`.

## 1) Create a service principal

1. Register an app in Microsoft Entra ID.
2. Create a client secret (save it immediately).
3. Note the tenant ID, client ID, and subscription ID.

## 2) Assign read-only roles

Grant RBAC roles at the smallest possible scope:
- `Monitoring Reader` for metrics and monitoring resources
- `Log Analytics Reader` (or `Log Analytics Data Reader`) for logs/workspace queries

Avoid contributor/owner roles for this integration.

## 3) Fill the Workbench tool form

- `Subscription ID`
- `Tenant ID`
- `Client ID`
- `Client secret`
