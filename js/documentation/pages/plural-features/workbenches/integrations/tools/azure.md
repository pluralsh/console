---
title: Azure Monitor
description: Connect Azure Monitor to a workbench and query metrics, Log Analytics logs, dashboards, and alert rules
---

Use the Azure Monitor integration to give a workbench read-only access to Azure Monitor platform metrics, Log Analytics logs, Azure portal dashboards, and alert rules in one Azure subscription. You can also point metrics at an Azure Monitor managed service for Prometheus workspace and query it with PromQL. After you configure the connection once, you can attach it to one or more workbenches and investigate Azure data with natural-language prompts.

This guide uses the Plural Console UI. For the complete list of integrations and general tool behavior, see [Workbench tools](/plural-features/workbenches/integrations/tools).

## Prerequisites

Before you begin, make sure you have:

* An Azure subscription whose resources send metrics to Azure Monitor or logs to a Log Analytics workspace.
* Permission in Microsoft Entra ID to register an application, and permission to assign Azure roles in the subscription.
* Optionally, an [Azure Monitor workspace](https://learn.microsoft.com/en-us/azure/azure-monitor/metrics/prometheus-api-promql) that stores Prometheus metrics, and its query endpoint.
* Permission in Plural Console to create a configured tool and edit the target workbench.
* An existing workbench, or permission to create one. See [Setting up a workbench](/plural-features/workbenches/configuration).

### Create a service principal

Plural authenticates to Azure with a client secret for a Microsoft Entra application:

1. In Microsoft Entra ID, [register an application](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app) for the integration.
2. Create a client secret for the application and copy its value immediately. Azure shows it only once.
3. Note the directory (tenant) ID, the application (client) ID, and the ID of the subscription you want to query.

### Azure roles

Assign read-only roles to the service principal:

| Role | Scope | What it allows |
|---|---|---|
| `Monitoring Reader` | The subscription | Native Azure Monitor metrics, metric definitions, portal dashboards, metric alert rules, and scheduled query rules |
| `Log Analytics Reader` or `Monitoring Reader` | The Log Analytics workspaces or resources whose logs the workbench queries | Log Analytics queries |
| `Monitoring Data Reader` | The Azure Monitor workspace | PromQL queries, only if you set a managed Prometheus query URL |

Assign `Monitoring Reader` on the subscription itself, not only on individual resources. Native metric queries use the Azure Monitor batch metrics API, which [requires Monitoring Reader on the subscription](https://learn.microsoft.com/en-us/azure/azure-monitor/metrics/migrate-to-batch-api), and dashboards and alert rules are listed across the whole subscription. Do not assign Contributor or Owner roles. The workbench tool is read-only.

## Capabilities

The Azure Monitor tool is read-only. It cannot create or modify resources, dashboards, alert rules, or stored data. Each metrics or logs query targets one Azure resource ID that the agent supplies, such as a virtual machine, an AKS cluster, or a Log Analytics workspace.

When **Metrics** is enabled, the workbench agent can call:

* **workbench_observability_metrics** — queries one or more comma-separated metric names in a metric namespace for a resource, such as `Percentage CPU` in `Microsoft.Compute/virtualMachines`. The agent can also set an aggregation, a dimension filter, ordering, and roll-up dimensions.
* **workbench_observability_metric_search** — lists the metric names defined for a resource whose names contain the search text, case-insensitively.
* **workbench_observability_metric_label_search** — lists the dimensions of a metric on a resource, or the values of one dimension.

When **Logs** is enabled, the agent can call:

* **workbench_observability_logs** — runs a Kusto Query Language (KQL) query against the logs for a resource. An empty query runs `search *`.
* **workbench_observability_log_aggregate** — counts matching log records per time bucket by appending `summarize count = count() by timestamp = bin(TimeGenerated, <bucket>)` to the KQL query.

Regardless of the capabilities you enable, the agent can also call:

* **workbench_observability_dashboards** and **workbench_observability_dashboard** — list the Azure portal dashboards in the subscription, and fetch one dashboard.
* **workbench_observability_monitors** and **workbench_observability_monitor** — list the metric alert rules and scheduled query (log search) alert rules in the subscription, and fetch one rule.

### Azure Managed Prometheus

When you set **Azure Managed Prometheus query URL**, the three metrics operations stop using Azure Monitor native metrics. Instead, they send PromQL queries, metric name searches, and label searches to that endpoint, in the same way as the [Prometheus tool](/plural-features/workbenches/integrations/tools/prometheus). Plural requests a Microsoft Entra token for the managed Prometheus API with the same service principal. Logs, dashboards, and alert rules are unaffected.

## Create the Azure Monitor tool

1. In Plural Console, open **Workbenches → Integrations**.
2. Find the **Azure Monitor** card and click **Add tool**.

### Configure the connection

On the **Configuration** step, enter:

* **Name** — a recognizable name for the connection, such as `azure_monitor_prod`. The name must start with a lowercase letter, end with a letter or number, and contain only lowercase letters, numbers, dots, and underscores.
* **Subscription ID** — the subscription to query.
* **Tenant ID** — the directory (tenant) ID of the application.
* **Client ID** — the application (client) ID.
* **Client secret** — the client secret value created in [Create a service principal](#create-a-service-principal).
* **Azure Managed Prometheus query URL (optional)** — leave this blank to use Azure Monitor native metrics. To use PromQL, enter the query endpoint from your Azure Monitor workspace's **Overview** page, such as `https://my-workspace-abcd.eastus.prometheus.monitor.azure.com`.

Under **Allowed capabilities**, select **Metrics**, **Logs**, or both. Both are selected by default. Enable only the capabilities the service principal is authorized to use and that the target workbenches need.

Click **Next**.

{% callout severity="warning" %}
Treat the client secret as a secret. Plural stores it encrypted and does not display it after saving. Never include credential values in screenshots, workbench prompts, or job output.
{% /callout %}

### Configure access

On the **Access policy** step, add the users or groups that should have read or write access to this configured tool:

* **Read permissions** control who can access and attach the tool to a workbench.
* **Write permissions** control who can modify the tool configuration and access policy.

Click **Save**. After the creation confirmation appears, the connection is available under **Workbenches → Configured Tools**.

## Attach Azure Monitor to a workbench

You can attach the tool while creating a workbench or add it to an existing one.

### New workbench

On the final **Attach tools** step of the workbench wizard:

1. Click **Add tools**.
2. Select the Azure Monitor connection by its configured name.
3. Complete the wizard by clicking **Create workbench**.

### Existing workbench

1. Open the workbench.
2. In the left sidebar, find **Tools** and click **Add tools**. You can also open the overflow menu and select **Tools**.
3. In **Add or remove tool from workbench**, select the Azure Monitor connection.
4. Click **Save**.

The configured Azure Monitor tool now appears in the workbench's **Tools** section.

## Query Azure Monitor from a workbench

Open the workbench's **Launch** tab and describe the investigation in the prompt box. The Azure Monitor tool cannot discover resources, so include the full resource ID of the resource or Log Analytics workspace you want to query, such as `/subscriptions/{subscription-id}/resourceGroups/{group}/providers/Microsoft.Compute/virtualMachines/{vm}`. Also include the metric or table you care about, a time range, and the result you want.

Try prompts such as:

* **Metrics:** `Using Azure Monitor, chart the average Percentage CPU for the VM /subscriptions/.../virtualMachines/web-01 over the last 6 hours at 5-minute intervals.`
* **Metric discovery:** `List the Azure Monitor metrics available for the AKS cluster /subscriptions/.../managedClusters/prod and summarize which ones relate to node memory.`
* **Logs:** `Query the Log Analytics workspace /subscriptions/.../workspaces/prod-logs for ContainerLogV2 errors in the last hour and summarize the most common messages.`
* **Log volume:** `Count ContainerLogV2 records where LogLevel is ERROR in 5-minute buckets over the last 2 hours in the workspace /subscriptions/.../workspaces/prod-logs.`
* **Alert rules:** `List the Azure Monitor alert rules in this subscription and describe the ones that target the prod resource group.`

Submit the job and watch its activity stream. To verify the integration, confirm that the job completes, open its Azure Monitor tool activity, and check that the call succeeded and returned data. A tool activity entry can also contain an API error, so its presence alone does not verify the connection. For more about job output, see [Running workbench jobs](/plural-features/workbenches/running-jobs).

## Query behavior and limits

Keep these behaviors in mind:

* **Native metric queries need a resource ID, a metric namespace, and an interval.** The query is a comma-separated list of metric names, and the interval is an ISO 8601 duration such as `PT5M` or `PT1H`. Results include a series for each aggregation Azure returns, labeled with the resource URI, the metric namespace, and any dimensions.
* **The metrics endpoint defaults to `https://global.metrics.monitor.azure.com`.** Microsoft documents the batch metrics API as regional, so the agent can override the endpoint per query with a regional one, such as `https://westus2.metrics.monitor.azure.com`.
* **Metric time ranges are limited to 7 days.** Metric, log, and log aggregation queries default to the last 60 minutes when no time range is given. Dimension value searches default to the last 24 hours.
* **Metric search needs a resource ID.** It returns up to 200 metric names by default and at most 500.
* **Dimension value searches need a metric namespace.** Listing a metric's dimension names does not.
* **Log queries use KQL and need a resource ID.** The time range is sent separately from the query, and the agent can set a maximum number of log entries. Results are sorted oldest first before the limit is applied, so narrow the time range when you need the most recent records.
* **Log entries are built from the result columns.** The message comes from a column such as `Message`, `Msg`, `Log`, `LogEntry`, or `RenderedMessage`, and the timestamp from `TimeGenerated`, `Timestamp`, or `Time`. Other columns become labels.
* **Log aggregation bins on `TimeGenerated`**, so the KQL query must return that column. Bucket sizes use KQL timespan syntax such as `5m` or `1h`. Facets become KQL `where` conditions on the named columns and are combined with `or` unless the agent requests `and`. The log search operation does not apply facets.
* **Dashboard and alert rule listings do not support search text.** A search returns an error, so the agent lists the whole subscription and pages through it. Alert rule listings return metric alert rules first and then scheduled query rules.
* **Fetching a single dashboard or alert rule** accepts its full resource ID. A bare name is treated as a dashboard or metric alert rule in the configured subscription, so use the full resource ID for scheduled query rules.

## Troubleshooting

### Authentication or permission errors

* Confirm that **Tenant ID**, **Client ID**, and **Client secret** belong to the same application and that the secret has not expired.
* For a `403` on metric queries, confirm that the service principal has `Monitoring Reader` on the subscription itself. Role assignments on individual resources are not enough for the batch metrics API.
* For a `403` on log queries, confirm the role assignment on the Log Analytics workspace or resource in the query.
* For a `403` on PromQL queries, confirm that the service principal has `Monitoring Data Reader` on the Azure Monitor workspace.
* Role assignments can take several minutes to take effect.
* To rotate the secret, open **Workbenches → Configured Tools**, select **Edit configuration**, and enter the replacement client secret. Existing secret values are never displayed.

### A query is rejected

* `azure metrics options require resource_id` or `require metrics_namespace` means the agent did not have enough information. Include the resource ID and the metric namespace in your prompt.
* `"step" is required` or `is not a valid ISO 8601 duration` means the metric interval was missing or used a format such as `5m`. Ask for an interval like `PT5M`.
* `azure logs options require resource_id` means the log query had no target. Include the workspace or resource ID in your prompt.
* `The time range is greater than the maximum allowed of 7 days` applies to metric queries. Split the investigation into shorter ranges.
* `azure does not support server-side dashboard search` or `monitor search` means the agent sent search text. Ask it to list everything and filter the results.

### No data is returned

* Run the same KQL query in the Azure portal's **Logs** blade, or open the metric in **Metrics explorer**, to confirm that data exists for the same resource and time range.
* Check that the resource ID, metric namespace, and metric names match exactly.
* If native metric queries fail or return nothing, ask the agent to use the regional metrics endpoint for the resource's region.
* For log aggregation, confirm that the queried table has a `TimeGenerated` column.
* Confirm that the required capability is enabled on the configured tool and that the tool is attached to the workbench.

### The Azure Monitor tool is unavailable

* Confirm that the tool appears under **Workbenches → Configured Tools**.
* Verify that your user or group has read access to the configured tool.
* Reopen the workbench's **Tools** dialog and confirm that the Azure Monitor connection is selected.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
* [Prometheus](/plural-features/workbenches/integrations/tools/prometheus)
* [Running workbench jobs](/plural-features/workbenches/running-jobs)
