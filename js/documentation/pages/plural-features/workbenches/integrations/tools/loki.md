---
title: Loki
description: Query log streams from a Loki-compatible endpoint
---

Use the Loki integration to give a workbench read-only access to log streams stored in Grafana Loki or a Loki-compatible service. The agent queries logs with LogQL and can return individual log lines or count log volume over time.

This guide uses the Plural Console UI. For the complete list of integrations and general tool behavior, see [Workbench tools](/plural-features/workbenches/integrations/tools).

## Prerequisites

Before you begin, make sure you have:

* A Loki endpoint that already receives the logs you want the workbench to query and is reachable from your Plural Console deployment.
* Permission in Plural Console to create a configured tool and edit the target workbench.
* The base URL of the Loki query API.
* Credentials if your Loki deployment or its gateway enforces authentication: a basic auth username and password, or a bearer token or API key.
* A tenant ID if your Loki deployment is multi-tenant.
* An existing workbench, or permission to create one. See [Setting up a workbench](/plural-features/workbenches/configuration).

### Prepare read-only access

Create a dedicated integration account or token with query access only. The tool calls only the Loki range query endpoint, `GET /loki/api/v1/query_range`; it never pushes logs or changes configuration. In a multi-tenant deployment, scope the credentials to the tenant and log data the workbench needs.

## Capabilities

The Loki tool is read-only and provides two operations:

* **Query logs** (`workbench_observability_logs`) — return log lines that match a LogQL query and optional label filters within a time range. Each entry includes its timestamp, line, and stream labels.
* **Aggregate logs** (`workbench_observability_log_aggregate`) — count matching log lines in fixed time buckets, such as `5m`, for trend and volume analysis.

## Create the Loki tool

1. In Plural Console, open **Workbenches → Integrations**.
2. Find the **Loki** card and click **Add tool**.

### Configure the connection

On the **Configuration** step, enter:

* **Name** — a recognizable name for the connection, such as `loki_production`. The name must start with a lowercase letter, end with a letter or number, and contain only lowercase letters, numbers, dots, and underscores.
* **URL** — the Loki base URL, for example `http://loki-gateway.monitoring.svc` or `https://loki.example.com`. Do not include the `/loki/api/v1` path.
* **Username** and **Password** — optional basic auth credentials.
* **Tenant ID** — optional tenant for multi-tenant deployments. Plural sends it in the `X-Scope-OrgID` header.
* **Bearer token / API key** — optional token, sent as `Authorization: Bearer <token>`. If you configure both a token and basic auth, the token takes precedence.

Click **Next**.

{% callout severity="warning" %}
Treat passwords and tokens as secrets. Plural stores them encrypted and does not display them after saving. Never include credential values in screenshots, workbench prompts, or job output.
{% /callout %}

### Configure access

On the **Access policy** step, add the users or groups that should have read or write access to this configured tool:

* **Read permissions** control who can access and attach the tool to a workbench.
* **Write permissions** control who can modify the tool configuration and access policy.

Click **Save**. After the creation confirmation appears, the connection is available under **Workbenches → Configured Tools**.

## Attach Loki to a workbench

You can attach the tool while creating a workbench or add it to an existing one.

### New workbench

On the final **Attach tools** step of the workbench wizard:

1. Click **Add tools**.
2. Select the Loki connection by its configured name.
3. Complete the wizard by clicking **Create workbench**.

### Existing workbench

1. Open the workbench.
2. In the left sidebar, find **Tools** and click **Add tools**. You can also open the overflow menu and select **Tools**.
3. In **Add or remove tool from workbench**, select the Loki connection.
4. Click **Save**.

The configured Loki tool now appears in the workbench's **Tools** section.

## Query Loki from a workbench

Open the workbench's **Launch** tab and describe the investigation in the prompt box. Include the log streams by their Loki labels, a time range, how many lines you want, and what you want to find. The workbench chooses the appropriate Loki operation; there is no separate LogQL query builder in Console.

Try prompts such as:

* `Using Loki, return the latest 200 error lines from namespace checkout in the last hour and summarize the most common messages.`
* `Query Loki for up to 100 lines from {namespace="prod", job="nginx"} containing "timeout" during the last 30 minutes.`
* `Using Loki, count log lines per 5 minutes for app=api over the last 6 hours and identify any spikes.`

You can include LogQL directly when you need precise filtering, for example `{namespace="prod", app="api"} |= "error" != "healthcheck"`.

Submit the job and watch its activity stream. To verify the integration, confirm that the job completes, open its Loki tool activity, and check that the call succeeded and returned log lines. A tool activity entry can also contain an API error, so its presence alone does not verify the connection. For more about job output, see [Running workbench jobs](/plural-features/workbenches/running-jobs).

## Query behavior and limits

The Loki tool is read-only. It cannot push logs or change labels, retention, or Loki configuration.

Keep these query behaviors in mind:

* When no time range is supplied, queries cover the last hour.
* Log queries must include a line limit. Loki rejects a query without a positive limit, so ask for a specific number of lines. When more lines match than the limit, Loki returns the newest lines first.
* Label filters the agent supplies are merged into the first stream selector as `label="value"`. If the query has no stream selector, they are added as a new selector in front of it.
* With an empty query, the label filters become the stream selector. With no query and no label filters, the tool uses `{job=~".+"}`, which matches only streams that have a nonempty `job` label.
* Log aggregation runs `sum(count_over_time(<query>[<bucket>]))` with the bucket size as the step, so the query must be a LogQL log query (a stream selector with optional filters), not a metric query. The bucket size uses Prometheus duration syntax, such as `1m`, `5m`, or `1h`.
* The agent receives at most 50 KiB of output per call; larger results are truncated. Use narrow selectors, line filters, and limits.
* A log operation times out after two minutes.

## Troubleshooting

### Authentication or connection errors

* Confirm that **URL** is reachable from the Plural Console deployment and does not include the `/loki/api/v1` path.
* For `401` or `403` responses, check the username and password or bearer token, and confirm that the identity has query access.
* For a multi-tenant deployment, confirm that **Tenant ID** matches the tenant that stores the logs. A missing tenant usually fails with a "no org id" error.
* To rotate credentials, open **Workbenches → Configured Tools**, select **Edit configuration**, and enter the replacement secret. Existing secret values are never displayed.

### No data is returned

* Run the same LogQL in Grafana Explore for the same time range to confirm that lines exist.
* Include an explicit time range and check label names and values for spelling or case mismatches.
* If the query has no stream selector and no label filters, remember that `{job=~".+"}` only matches streams with a `job` label. Name a stream selector explicitly.
* Confirm that the Loki tool is attached to the workbench.

### A query fails or returns incomplete results

* Open the failed Loki activity in the job and inspect the error before retrying.
* If Loki reports `limit must be a positive value`, retry with a prompt that asks for a specific number of lines.
* If a log aggregation fails to parse, make sure the query is a log query, such as `{app="api"} |= "error"`, and the bucket size is a valid duration.
* If results are truncated or the query times out, narrow the stream selector, add line filters, lower the line limit, or shorten the time range.

### The Loki tool is unavailable

* Confirm that the tool appears under **Workbenches → Configured Tools**.
* Verify that your user or group has read access to the configured tool.
* Reopen the workbench's **Tools** dialog and confirm that the Loki connection is selected.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
