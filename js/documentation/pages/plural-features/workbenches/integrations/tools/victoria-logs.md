---
title: VictoriaLogs
description: Query logs from a VictoriaLogs endpoint
---

The VictoriaLogs tool gives a workbench read-only access to logs stored in a VictoriaLogs endpoint. The agent queries logs using LogsQL (VictoriaMetrics' log query language) and can retrieve individual log entries or aggregate log counts over time.

## Prerequisites

Before you begin, make sure you have:

* A VictoriaLogs deployment that is already receiving the logs you want the workbench to query.
* Permission in Plural Console to create a configured tool and edit the target workbench.
* The VictoriaLogs query base URL (the service that handles `/select/logsql/*` endpoints).
* Credentials if your VictoriaLogs deployment requires authentication: basic auth (username and password), a bearer token or API key, and optionally account ID and project ID for multi-tenant deployments.
* An existing workbench, or permission to create one. See [Setting up a workbench](/plural-features/workbenches/configuration).

## Capabilities

The VictoriaLogs tool supports two read-only operations:

* **Query logs** — retrieve log entries matching a LogsQL query and time range. Results are capped at 500 log entries.
* **Aggregate logs** — count log entries in time buckets using the `/select/logsql/hits` endpoint for trend analysis and volume monitoring.

The tool requires query/read access to VictoriaLogs. Scope credentials to the tenant (account ID and project ID) that the workbench needs if your cluster is multi-tenant.

{% callout severity="info" %}
VictoriaLogs uses LogsQL, not Loki's LogQL. The query languages are similar but not identical. See the [VictoriaLogs documentation](https://docs.victoriametrics.com/victorialogs/logsql/) for LogsQL syntax.
{% /callout %}

## Create the VictoriaLogs tool

1. In Plural Console, open **Workbenches → Integrations**.
2. Find the **VictoriaLogs** card and click **Add tool**.

### Configure the connection

On the **Configuration** step, enter:

* **Name** — a recognizable name for the connection, such as `victorialogs-production`.
* **URL** — the VictoriaLogs query base URL, for example `http://victoria-logs:9428` or `https://victorialogs.example.com`.
* **Username** and **Password** — optional basic auth credentials if required by your VictoriaLogs deployment or gateway (such as vmauth or nginx).
* **Bearer token / API key** — optional token auth if your VictoriaLogs deployment uses bearer authentication instead of basic auth.
* **Account ID** and **Project ID** — set these fields when querying a multi-tenant VictoriaLogs cluster. The default tenant is `0:0`. Leave empty for single-tenant deployments or when tenant routing is handled upstream.

Click **Next**.

### Configure access

On the **Access policy** step, add the users or groups that should have read or write access to this configured tool:

* **Read permissions** control who can access and attach the tool to a workbench.
* **Write permissions** control who can modify the tool configuration and access policy.

Click **Save**. After the creation confirmation appears, the connection is available under **Workbenches → Configured Tools**.

## Attach VictoriaLogs to a workbench

You can attach the tool while creating a workbench or add it to an existing one.

### New workbench

On the final **Attach tools** step of the workbench wizard:

1. Click **Add tools**.
2. Select the VictoriaLogs connection by its configured name.
3. Complete the wizard by clicking **Create workbench**.

### Existing workbench

1. Open the workbench.
2. In the left sidebar, find **Tools** and click **Add tools**. You can also open the overflow menu and select **Tools**.
3. In **Add or remove tool from workbench**, select the VictoriaLogs connection.
4. Click **Save**.

The configured VictoriaLogs tool now appears in the workbench's **Tools** section.

## Query VictoriaLogs from a workbench

Open the workbench's **Launch** tab and describe the investigation in the prompt box. Include the search terms or filters, a time range, and what you want to find. The workbench chooses the appropriate VictoriaLogs operation; there is no separate VictoriaLogs query builder in Console.

Try prompts such as:

* `Using VictoriaLogs, find error logs from the checkout service in the last hour.`
* `Query VictoriaLogs for logs containing "timeout" during the last 30 minutes. Group by app and summarize.`
* `Using VictoriaLogs, aggregate log volume by hour over the last 24 hours and identify any spikes.`

You can include LogsQL syntax directly in prompts when you need precise filtering, for example `{app="nginx"} "timeout"` or `status:>=500`.

Submit the job and watch its activity stream. To verify the integration, confirm that the job completes, open its VictoriaLogs tool activity, and check that the call succeeded and returned log data. A tool activity entry can also contain an API error, so its presence alone does not verify the connection. For more about job output, see [Running workbench jobs](/plural-features/workbenches/running-jobs).

## Query behavior and limits

The VictoriaLogs tool is read-only. It cannot create or modify log streams or VictoriaLogs configuration.

Keep these query behaviors in mind:

* Queries use LogsQL syntax, not Loki LogQL. Simple text searches, field filters (`field:value`), exact-match filters (`field:="value"`), and phrase searches (`"exact phrase"`) are supported.
* Log queries return a maximum of 500 entries. Use explicit time ranges and filters to narrow results.
* Facets provided by the agent are appended to the LogsQL query as `field:="value"` exact-match filters.
* Specify explicit time ranges for predictable results. The default time range covers recent logs when no range is supplied.
* For multi-tenant deployments, the tool routes requests using the configured account ID and project ID via `AccountID` and `ProjectID` request headers.

## Troubleshooting

### Authentication errors

* Verify that the **URL** is correct and reachable from the Plural workbench environment.
* If your VictoriaLogs deployment requires authentication, confirm that the username and password or bearer token are configured correctly.
* For multi-tenant deployments, ensure that **Account ID** and **Project ID** match the tenant you want to query. The default is `0:0`.
* To rotate credentials, open **Workbenches → Configured Tools**, select **Edit configuration**, and enter the replacement credentials. Existing secret values are never displayed.

### No data is returned

* Verify in VictoriaLogs that the expected logs exist for the same query and time range.
* Include an explicit time range and check field names and values for spelling or case mismatches.
* Confirm that the query uses LogsQL syntax, not Loki LogQL. VictoriaLogs uses `:=` for exact matches and `:` for other comparisons.
* For multi-tenant deployments, verify that the **Account ID** and **Project ID** match the tenant where the logs are stored.
* Confirm that the tool is attached to the workbench by opening the workbench's **Tools** dialog.

### A query fails or returns incomplete results

* Open the failed VictoriaLogs activity in the job and inspect the error message before retrying.
* Verify LogsQL syntax. Start with a simple, known-good query and add filters incrementally. See the [VictoriaLogs LogsQL documentation](https://docs.victoriametrics.com/victorialogs/logsql/) for examples.
* Remember that results are capped at 500 log entries. Use narrower time ranges or more specific filters if the result set is incomplete.

### The VictoriaLogs tool is unavailable

* Confirm that the tool appears under **Workbenches → Configured Tools**.
* Verify that your user or group has read access to the configured tool.
* Reopen the workbench's **Tools** dialog and confirm that the VictoriaLogs connection is selected.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
* [VictoriaLogs LogsQL documentation](https://docs.victoriametrics.com/victorialogs/logsql/)
