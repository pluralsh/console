# Azure Monitor tool setup

Use this guide to fill `Subscription ID`, `Tenant ID`, `Client ID`, `Client secret`, and optionally `Azure Managed Prometheus query URL`.

## 1) Create a service principal

1. Register an app in Microsoft Entra ID.
2. Create a client secret (save it immediately).
3. Note the tenant ID, client ID, and subscription ID.

## 2) Assign read-only roles

Grant RBAC roles at the smallest scope that works:
- `Monitoring Reader` on the **subscription** for metrics, dashboards, and alert rules. Metrics are queried through the Azure Monitor metrics batch API, which requires `Monitoring Reader` on the subscription itself; a role on individual resources or resource groups is not enough.
- `Log Analytics Reader` (or `Log Analytics Data Reader`) on the Log Analytics workspaces for logs/workspace queries

If you use **Azure Managed Prometheus** (see below), also assign `Monitoring Data Reader` to the service principal on the Azure Monitor workspace so it can query that workspace’s Prometheus API.

Avoid contributor/owner roles for this integration.

## 3) Optional: Azure Managed Prometheus query URL

The optional **Azure Managed Prometheus query URL** field changes how **metrics** tools behave for this connection:

- **Leave it blank** (default): metrics use **Azure Monitor** native metrics APIs. Tool inputs follow the Azure-specific metrics schema (resource id, metric namespace, aggregation, and related filters).
- **Set it** to your workspace’s **Prometheus-compatible query base URL**: metrics and metric-name search use **PromQL** against that endpoint, similar to a standalone Prometheus tool. The URL is stored as non-secret configuration (same RBAC and network rules apply as for any URL you configure).

Use this when your primary metrics source for the agent is **Azure Monitor managed service for Prometheus** (or another Prometheus-compatible endpoint you trust), not when you only need classic Azure Monitor metrics.

## 4) Fill the Workbench tool form

- `Subscription ID`
- `Tenant ID`
- `Client ID`
- `Client secret`
- `Azure Managed Prometheus query URL` (optional; see section 3)
