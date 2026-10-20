---
title: Loki
description: Query log streams from a Loki-compatible endpoint
---

The Loki tool gives a workbench read-only access to log streams stored in Loki or a Loki-compatible service. The agent queries logs using LogQL and can retrieve individual log entries or aggregate log counts over time.

## Prerequisites

Before you begin, make sure you have:

* A Loki endpoint that is already receiving the logs you want the workbench to query.
* Permission in Plural Console to create a configured tool and edit the target workbench.
* The Loki query API base URL.
* Credentials if your Loki deployment requires authentication: basic auth (username and password), a bearer token or API key, and optionally a tenant ID for multi-tenant deployments.
* An existing workbench, or permission to create one. See [Setting up a workbench](/plural-features/workbenches/configuration).

## Capabilities

The Loki tool supports two read-only operations:

* **Query logs** — retrieve log entries matching a LogQL query, label selectors, and time range. Results are capped at 500 log entries.
* **Aggregate logs** — count log entries in time buckets for trend analysis and volume monitoring.

The tool requires query/read access to Loki. Scope credentials to the tenant and log streams that the workbench needs.

## Create the Loki tool

1. In Plural Console, open **Workbenches → Integrations**.
2. Find the **Loki** card and click **Add tool**.

### Configure the connection

On the **Configuration** step, enter:

* **Name** — a recognizable name for the connection, such as `loki-production`.
* **URL** — the Loki query API base URL, for example `http://loki:3100` or `https://loki.example.com`.
* **Username** and **Password** — optional basic auth credentials if required by your Loki deployment or gateway.
* **Bearer token / API key** — optional token auth if your Loki deployment uses bearer authentication instead of basic auth.
* **Tenant ID** — set this field when your Loki deployment requires tenant separation (for example via the `X-Scope-OrgID` header). Leave empty for single-tenant deployments.

Click **Next**.

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

Open the workbench's **Launch** tab and describe the investigation in the prompt box. Include the log streams (using Loki labels), a time range, and what you want to find. The workbench chooses the appropriate Loki operation; there is no separate Loki query builder in Console.

Try prompts such as:

* `Using Loki, show me error logs from the checkout service in the last hour.`
* `Query Loki for logs from the prod namespace with job=nginx during the last 30 minutes. Summarize the most common messages.`
* `Using Loki, aggregate log volume by hour for the api service over the last 24 hours and identify any spikes.`

You can include LogQL syntax directly in prompts when you need precise filtering, for example `{namespace="prod",job="api"} |= "error"`.

Submit the job and watch its activity stream. To verify the integration, confirm that the job completes, open its Loki tool activity, and check that the call succeeded and returned log data. A tool activity entry can also contain an API error, so its presence alone does not verify the connection. For more about job output, see [Running workbench jobs](/plural-features/workbenches/running-jobs).

## Query behavior and limits

The Loki tool is read-only. It cannot create or modify log streams, labels, or Loki configuration.

Keep these query behaviors in mind:

* Log queries return a maximum of 500 entries. Use explicit time ranges and label selectors to filter results.
* When no query text is provided and label selectors (facets) are supplied, the tool uses those labels as the LogQL stream selector.
* When neither a query nor facets are provided, the tool defaults to `{job=~".+"}`, which returns only log streams with a nonempty `job` label.
* Label selectors provided as facets are merged into the LogQL query as `{label_name="value"}`. If the query already contains a stream selector, the facets are appended to it.
* Specify explicit time ranges for predictable results. The default time range covers recent logs when no range is supplied.

## Troubleshooting

### Authentication errors

* Verify that the **URL** is correct and reachable from the Plural workbench environment.
* If your Loki deployment requires authentication, confirm that the username and password or bearer token are configured correctly.
* For multi-tenant Loki deployments, ensure that **Tenant ID** matches the tenant you want to query.
* To rotate credentials, open **Workbenches → Configured Tools**, select **Edit configuration**, and enter the replacement credentials. Existing secret values are never displayed.

### No data is returned

* Verify in Loki that the expected log streams exist for the same label selectors and time range.
* Include an explicit time range and check label names and values for spelling or case mismatches.
* Remember that the default query `{job=~".+"}` only matches streams with a nonempty `job` label. Use explicit label selectors or query text to broaden the search.
* Confirm that the tool is attached to the workbench by opening the workbench's **Tools** dialog.

### A query fails or returns incomplete results

* Open the failed Loki activity in the job and inspect the error message before retrying.
* Verify LogQL syntax for label selectors and filters. Start with a simple, known-good query and add filters incrementally.
* Remember that results are capped at 500 log entries. Use narrower time ranges or more specific label selectors if the result set is incomplete.

### The Loki tool is unavailable

* Confirm that the tool appears under **Workbenches → Configured Tools**.
* Verify that your user or group has read access to the configured tool.
* Reopen the workbench's **Tools** dialog and confirm that the Loki connection is selected.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
