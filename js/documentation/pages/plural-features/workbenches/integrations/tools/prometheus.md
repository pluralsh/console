---
title: Prometheus
description: Query metrics from a Prometheus-compatible endpoint
---

The Prometheus tool lets a workbench agent query metrics from a Prometheus-compatible endpoint. Configure the connection once, then attach it to the workbenches that should use it.

## Prerequisites

Before you begin, make sure you have:

* A Prometheus-compatible query endpoint (Prometheus, Mimir, Cortex, Thanos, or Amazon Managed Prometheus) that is already receiving the metrics you want the workbench to query.
* Permission in Plural Console to create a configured tool and edit the target workbench.
* Credentials for the endpoint: basic auth username/password, a bearer token, AWS SigV4 access (for Amazon Managed Prometheus), or no authentication if the endpoint is already network-restricted.
* An existing workbench, or permission to create one.

### Prepare read-only access

Create a dedicated identity for this integration and grant it query-only access in your gateway or proxy layer — avoid exposing write or admin endpoints to it.

## Capabilities

* `workbench_observability_metrics` — Run a PromQL range query against the endpoint over a time range, with an optional `step` resolution (defaults to 30 seconds if omitted). Queries must cover less than 7 days.
* `workbench_observability_metric_search` — Search metric names (the `__name__` label) seen on the endpoint in the last 24 hours, optionally filtered by a substring.
* `workbench_observability_metric_label_search` — For a given metric, search its label names, or its values for a specific label, also over the last 24 hours.

This tool is read-only and registers only these metrics operations — Prometheus has no logs, traces, dashboard, or monitor capability in Workbenches.

## Create the Prometheus tool

1. In Plural Console, open **Workbenches → Integrations**.
2. Find the **Prometheus** card and click **Add tool**.

On the **Configuration** step, enter:

* **URL** — the Prometheus query endpoint base URL. Required.
* **Username** / **Password** — if the endpoint uses basic auth.
* **Tenant ID** — optional, for multi-tenant backends like Mimir or Cortex. Sent as the `X-Scope-OrgID` header.
* **Bearer token / API key** — optional alternative to basic auth.

If you're connecting to Amazon Managed Prometheus, enable **Sign requests with AWS SigV4** instead and provide:

* **AWS region** — for example `us-east-1`.
* **Access key ID** / **Secret access key** — optional. Leave both blank to use IRSA, pod identity, or another AWS credential source already available to the Console runtime.

Click **Next**.

{% callout severity="warning" %}
Treat the password, bearer token, and secret access key as secrets. Plural stores them encrypted and does not display them after saving.
{% /callout %}

### Configure access

On the **Access policy** step, add the users or groups that should have read or write access to this configured tool:

* **Read permissions** control who can access and attach the tool to a workbench.
* **Write permissions** control who can modify the tool configuration and access policy.

Click **Save**. The connection is now available under **Workbenches → Configured Tools**.

## Attach Prometheus to a workbench

You can attach the tool while creating a workbench or add it to an existing one. See [Workbench tools](/plural-features/workbenches/integrations/tools#attaching-tools-to-a-workbench) for the attachment steps, which are the same for every tool type.

## Using it from a workbench

Open the workbench's **Launch** tab and describe the investigation in the prompt box. Include the signal, relevant labels, and a time range. Try prompts such as:

* `Using Prometheus, graph the 95th percentile request latency for the checkout service over the last hour.`
* `Search Prometheus for metric names related to "memory" and tell me which ones are reporting data right now.`
* `For the metric node_filesystem_avail_bytes, list the values of the mountpoint label so I know which filesystems are being tracked.`

Use PromQL syntax directly in the prompt when you need precise filtering, such as `rate(http_requests_total{job="checkout"}[5m])`.

## Query behavior and limits

* Specify a time range explicitly. When none is supplied, the query defaults to the last 60 minutes.
* Metrics queries must cover less than seven days; narrow the time range if a query is rejected.
* Metric-name and label discovery look back only 24 hours, so a metric or label that stopped reporting more than a day ago will not appear in search results.
* If no `step` is supplied, range queries default to a 30-second resolution.

## Troubleshooting

### Authentication or permission errors

* Confirm the endpoint's expected auth method matches what you configured — basic auth, bearer token, and SigV4 are independent settings and only the one the backend expects will succeed.
* For a multi-tenant backend, confirm **Tenant ID** matches the tenant that owns the metrics you expect to query.
* For Amazon Managed Prometheus, confirm **AWS region** is set (or resolvable from the default AWS credential chain) and that the credentials used can call the workspace's query API.

### No data is returned

* Verify the same query and time range return data directly against the endpoint.
* Remember metric and label search only cover the last 24 hours — use `workbench_observability_metrics` with an explicit PromQL query and time range for older data instead.
* Confirm the tool is attached to the workbench you're using.

### A query fails or returns incomplete results

* Keep the queried time range under 7 days.
* Check PromQL syntax against the Prometheus query language documentation, starting with a narrow, known-good query and adding filters incrementally.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
