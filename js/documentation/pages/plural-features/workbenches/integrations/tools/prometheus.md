---
title: Prometheus
description: Query metrics from a Prometheus-compatible endpoint
---

Use the Prometheus integration to give a workbench read-only access to metrics stored in Prometheus or a Prometheus-compatible backend, such as Thanos, Grafana Mimir, Cortex, or Amazon Managed Service for Prometheus. The agent runs PromQL range queries and can discover metric names, label names, and label values before it builds a query.

This guide uses the Plural Console UI. For the complete list of integrations and general tool behavior, see [Workbench tools](/plural-features/workbenches/integrations/tools).

## Prerequisites

Before you begin, make sure you have:

* A Prometheus-compatible endpoint that serves the Prometheus HTTP query API (`/api/v1/...`) and is reachable from your Plural Console deployment.
* Permission in Plural Console to create a configured tool and edit the target workbench.
* Credentials if the endpoint enforces authentication: a basic auth username and password, a bearer token or API key, or AWS credentials for Amazon Managed Service for Prometheus.
* A tenant ID if your backend is multi-tenant, such as Grafana Mimir or Cortex.
* An existing workbench, or permission to create one. See [Setting up a workbench](/plural-features/workbenches/configuration).

### Prepare read-only access

Create a dedicated identity for the integration and grant it query access only. The tool reads metrics through the query and label endpoints; it never writes samples, rules, or configuration. If your endpoint sits behind a gateway or proxy, restrict the identity to the read path and block write or admin endpoints.

For Amazon Managed Service for Prometheus, the IAM identity that signs requests needs:

| Capability | Required IAM action | What the workbench can query |
|---|---|---|
| **Metric queries** | `aps:QueryMetrics` | PromQL range queries |
| **Metric and label discovery** | `aps:GetLabels` | Metric names, label names, and label values |

The AWS managed policy [`AmazonPrometheusQueryAccess`](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonPrometheusQueryAccess.html) includes both actions. Scope the policy's resource to the workspace ARN where possible.

## Capabilities

The Prometheus tool is read-only and provides three operations:

* **Query metrics** (`workbench_observability_metrics`) — run a PromQL range query over a time range and step, and return each resulting series with its labels and samples.
* **Search metric names** (`workbench_observability_metric_search`) — find metric names that contain a search string.
* **Search metric labels** (`workbench_observability_metric_label_search`) — for a given metric, list its label names, or list the values of one label.

## Create the Prometheus tool

1. In Plural Console, open **Workbenches → Integrations**.
2. Find the **Prometheus** card and click **Add tool**.

### Configure the connection

On the **Configuration** step, enter:

* **Name** — a recognizable name for the connection, such as `prometheus_production`. The name must start with a lowercase letter, end with a letter or number, and contain only lowercase letters, numbers, dots, and underscores.
* **URL** — the base URL under which the endpoint serves `/api/v1/query_range`. Do not include the `/api/v1` path. For example:
  * Prometheus: `http://prometheus-server.monitoring.svc:9090`
  * Grafana Mimir: `https://mimir.example.com/prometheus`
  * Amazon Managed Service for Prometheus: `https://aps-workspaces.us-east-1.amazonaws.com/workspaces/ws-12345678-abcd-1234-abcd-123456789012`
* **Username** and **Password** — optional basic auth credentials.
* **Tenant ID** — optional tenant for multi-tenant backends. Plural sends it in the `X-Scope-OrgID` header.
* **Bearer token / API key** — optional token, sent as `Authorization: Bearer <token>`. If you configure both a token and basic auth, the token takes precedence.

To query Amazon Managed Service for Prometheus, turn on **Sign requests with AWS SigV4** and fill in:

* **AWS region** — the workspace region, such as `us-east-1`. You can leave it blank only if the region is available from the Console runtime's AWS credential chain.
* **Access key ID** and **Secret access key** — static credentials for an IAM user with the permissions above. Provide both or neither. Leave both blank to use IRSA, EKS Pod Identity, or another AWS credential source available to the Console runtime.

SigV4 signing replaces any `Authorization` header, so leave **Username**, **Password**, and **Bearer token / API key** empty when SigV4 is on.

Click **Next**.

{% callout severity="warning" %}
Treat passwords, tokens, and AWS secret keys as secrets. Plural stores them encrypted and does not display them after saving. Never include credential values in screenshots, workbench prompts, or job output.
{% /callout %}

### Configure access

On the **Access policy** step, add the users or groups that should have read or write access to this configured tool:

* **Read permissions** control who can access and attach the tool to a workbench.
* **Write permissions** control who can modify the tool configuration and access policy.

Click **Save**. After the creation confirmation appears, the connection is available under **Workbenches → Configured Tools**.

## Attach Prometheus to a workbench

You can attach the tool while creating a workbench or add it to an existing one.

### New workbench

On the final **Attach tools** step of the workbench wizard:

1. Click **Add tools**.
2. Select the Prometheus connection by its configured name.
3. Complete the wizard by clicking **Create workbench**.

### Existing workbench

1. Open the workbench.
2. In the left sidebar, find **Tools** and click **Add tools**. You can also open the overflow menu and select **Tools**.
3. In **Add or remove tool from workbench**, select the Prometheus connection.
4. Click **Save**.

The configured Prometheus tool now appears in the workbench's **Tools** section.

## Query Prometheus from a workbench

Open the workbench's **Launch** tab and describe the investigation in the prompt box. Include the metric or signal, relevant labels such as namespace, job, or pod, a time range, and the result you want. The workbench chooses the appropriate Prometheus operation; there is no separate PromQL query builder in Console.

Try prompts such as:

* `Using Prometheus, chart the per-pod CPU usage for the checkout namespace over the last hour and identify the top consumers.`
* `Find Prometheus metrics related to HTTP request latency, then compare the p99 latency for the api job over the last 6 hours with a 5m step.`
* `Using Prometheus, list the label values of namespace for kube_pod_status_phase and report any namespace with pods stuck in Pending.`

You can include PromQL directly when you need precise results, for example `sum by (pod) (rate(container_cpu_usage_seconds_total{namespace="checkout"}[5m]))`.

Submit the job and watch its activity stream. To verify the integration, confirm that the job completes, open its Prometheus tool activity, and check that the call succeeded and returned series. A tool activity entry can also contain an API error, so its presence alone does not verify the connection. For more about job output, see [Running workbench jobs](/plural-features/workbenches/running-jobs).

## Query behavior and limits

The Prometheus tool is read-only. It cannot write samples or change recording rules, alerting rules, or backend configuration.

Keep these query behaviors in mind:

* Metric queries are PromQL range queries. When no time range is supplied, the query covers the last hour. The range must be shorter than seven days.
* The default step is 30 seconds. The start of the range is rounded down and the end rounded up to a multiple of the step. For long ranges, ask for a larger step: Prometheus rejects range queries that would return more than 11,000 points per series.
* Samples with `NaN` or infinite values are dropped from the results.
* Metric-name search reads up to 5,000 metric names seen in the last 24 hours, filters them with a case-insensitive substring match, and returns up to 200 names by default.
* Label search covers the last 24 hours unless the agent supplies a time range, and returns up to 200 results by default. The search string filters the labels or values that the endpoint returns, so ask for a higher limit if an expected label is missing.
* The agent receives at most 50 KiB of output per call; larger results are truncated. Aggregate with PromQL (for example `sum by (...)` or `topk`) instead of returning many raw series.
* A metric operation times out after 30 seconds.

## Troubleshooting

### Authentication or connection errors

* Confirm that **URL** is reachable from the Plural Console deployment and points to the base of the Prometheus API, without `/api/v1`.
* For `401` or `403` responses, check the username and password or bearer token, and confirm that the identity can read the query and label endpoints.
* For a multi-tenant backend, confirm that **Tenant ID** matches the tenant that stores the metrics. A wrong or missing tenant usually returns an error or no data.
* For Amazon Managed Service for Prometheus, confirm that **Sign requests with AWS SigV4** is on, that **AWS region** matches the workspace, and that the signing identity has `aps:QueryMetrics` and `aps:GetLabels`.
* If you see an error about AWS credentials or region, either enter both **Access key ID** and **Secret access key**, or confirm that the Console runtime has an AWS identity through IRSA or EKS Pod Identity, and enter **AWS region**.
* To rotate credentials, open **Workbenches → Configured Tools**, select **Edit configuration**, and enter the replacement secret. Existing secret values are never displayed; leave a secret field blank to keep the stored value.

### No data is returned

* Run the same PromQL in Prometheus or Grafana for the same time range to confirm that data exists.
* Include an explicit time range and check metric names and label values for spelling or case mismatches. Ask the workbench to search metric names or labels first.
* Confirm that the Prometheus tool is attached to the workbench.

### A query fails or returns incomplete results

* Open the failed Prometheus activity in the job and inspect the API error before retrying.
* If the error mentions the maximum resolution of 11,000 points, increase the step or shorten the time range.
* If the error says the time range is greater than the maximum allowed, keep the range under seven days.
* If the output is truncated or the query times out, aggregate the query, add label filters, or shorten the range.

### The Prometheus tool is unavailable

* Confirm that the tool appears under **Workbenches → Configured Tools**.
* Verify that your user or group has read access to the configured tool.
* Reopen the workbench's **Tools** dialog and confirm that the Prometheus connection is selected.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
