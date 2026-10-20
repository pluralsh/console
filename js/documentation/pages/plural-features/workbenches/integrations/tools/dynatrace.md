---
title: Dynatrace
description: Connect Dynatrace to a workbench and query metrics, logs, traces, dashboards, and monitors with DQL
---

Use the Dynatrace integration to give a workbench read-only access to the metrics, logs, and spans stored in Dynatrace Grail, plus your Dynatrace dashboards and anomaly-detection settings. After you configure the connection once, you can attach it to one or more workbenches and investigate Dynatrace data with natural-language prompts. The workbench writes [Dynatrace Query Language (DQL)](https://docs.dynatrace.com/docs/platform/grail/dynatrace-query-language) for you.

This guide uses the Plural Console UI. For the complete list of integrations and general tool behavior, see [Workbench tools](/plural-features/workbenches/integrations/tools).

## Prerequisites

Before you begin, make sure you have:

* A Dynatrace SaaS environment whose Grail storage contains the metrics, logs, or spans you want the workbench to query.
* The platform URL of your environment, in the form `https://{environment-id}.apps.dynatrace.com`. Plural calls Dynatrace platform APIs, which are served from this domain.
* A [Dynatrace platform token](https://docs.dynatrace.com/docs/manage/identity-access-management/access-tokens-and-oauth-clients/platform-tokens) with the scopes described below.
* Permission in Plural Console to create a configured tool and edit the target workbench.
* An existing workbench, or permission to create one. See [Setting up a workbench](/plural-features/workbenches/configuration).

### Create a platform token

In Dynatrace:

1. Decide which user owns the token. A dedicated service user is recommended, because a platform token only works within the permissions of the user it belongs to.
2. Make sure that user's IAM policies allow reading the Grail buckets and tables, documents, and settings the workbench needs. See [Permissions in Grail](https://docs.dynatrace.com/docs/platform/grail/organize-data/assign-permissions-in-grail).
3. Create a platform token for that user, limit it to the target environment, and select the scopes in the next section.
4. Copy the token immediately. Dynatrace shows it only once.

### Dynatrace scopes

Grant only the scopes for the capabilities you plan to enable:

| Capability | Required scopes | What the workbench can query |
|---|---|---|
| **Metrics** | `storage:buckets:read`, `storage:metrics:read` | `timeseries` queries and metric key search |
| **Logs** | `storage:buckets:read`, `storage:logs:read` | `fetch logs` queries and log counts |
| **Traces** | `storage:buckets:read`, `storage:spans:read` | `fetch spans` queries |
| Dashboards | `document:documents:read` | Dashboard documents |
| Monitors | `settings:objects:read` | Custom anomaly detectors and metric events |

Do not grant write or admin scopes. The workbench tool is read-only.

## Capabilities

The Dynatrace tool is read-only. It cannot create or modify dashboards, settings, or stored data. Metric, log, and trace operations send DQL to the Grail query API (`/platform/storage/query/v1/query:execute`) and poll until the query finishes.

When **Metrics** is enabled, the workbench agent can call:

* **workbench_observability_metrics** — runs a DQL query that starts with `timeseries`, such as `timeseries avg(dt.host.cpu.usage), by:{dt.entity.host}, from:-1h`.
* **workbench_observability_metric_search** — finds metric keys that contain the search text, case-insensitively, using `metrics | filter contains(metric.key, ...)`.

When **Logs** is enabled, the agent can call:

* **workbench_observability_logs** — runs a DQL query that starts with `fetch logs`. An empty query runs `fetch logs`.
* **workbench_observability_log_aggregate** — counts log records per time bucket by appending `summarize count = count(), by:{timestamp = bin(timestamp, <bucket>)}` to a `fetch logs` query.

When **Traces** is enabled, the agent can call:

* **workbench_observability_traces** — runs a DQL query that starts with `fetch spans`. Results are individual spans, not reconstructed trace trees.

Regardless of the capabilities you enable, the agent can also call:

* **workbench_observability_dashboards** and **workbench_observability_dashboard** — list dashboard documents whose names contain the search text, and fetch one dashboard by document ID.
* **workbench_observability_monitors** and **workbench_observability_monitor** — list settings objects from the `builtin:davis.anomaly-detectors` and `builtin:anomaly-detection.metric-events` schemas whose title or summary contains the search text, and fetch one by object ID.

{% callout severity="warning" %}
In the current release, **workbench_observability_logs** and **workbench_observability_traces** fail with an `unsupported use of 'range'` error, because the workbench always sends a time range that the Dynatrace integration rejects for these two operations. Metrics, metric search, log aggregation, dashboards, and monitors are not affected.
{% /callout %}

## Create the Dynatrace tool

1. In Plural Console, open **Workbenches → Integrations**.
2. Find the **Dynatrace** card and click **Add tool**.

### Configure the connection

On the **Configuration** step, enter:

* **Name** — a recognizable name for the connection, such as `dynatrace_prod`. The name must start with a lowercase letter, end with a letter or number, and contain only lowercase letters, numbers, dots, and underscores.
* **URL** — the platform URL of your environment, such as `https://abc12345.apps.dynatrace.com`. The form's placeholder shows a `live.dynatrace.com` address, but the APIs Plural calls are served from `apps.dynatrace.com`.
* **Platform token** — the token created in [Create a platform token](#create-a-platform-token).

Under **Allowed capabilities**, select one or more of **Metrics**, **Logs**, and **Traces**. All three are selected by default. Enable only the capabilities the token is authorized to use and that the target workbenches need.

Click **Next**.

{% callout severity="warning" %}
Treat the platform token as a secret. Plural stores it encrypted and does not display it after saving. Never include credential values in screenshots, workbench prompts, or job output.
{% /callout %}

### Configure access

On the **Access policy** step, add the users or groups that should have read or write access to this configured tool:

* **Read permissions** control who can access and attach the tool to a workbench.
* **Write permissions** control who can modify the tool configuration and access policy.

Click **Save**. After the creation confirmation appears, the connection is available under **Workbenches → Configured Tools**.

## Attach Dynatrace to a workbench

You can attach the tool while creating a workbench or add it to an existing one.

### New workbench

On the final **Attach tools** step of the workbench wizard:

1. Click **Add tools**.
2. Select the Dynatrace connection by its configured name.
3. Complete the wizard by clicking **Create workbench**.

### Existing workbench

1. Open the workbench.
2. In the left sidebar, find **Tools** and click **Add tools**. You can also open the overflow menu and select **Tools**.
3. In **Add or remove tool from workbench**, select the Dynatrace connection.
4. Click **Save**.

The configured Dynatrace tool now appears in the workbench's **Tools** section.

## Query Dynatrace from a workbench

Open the workbench's **Launch** tab and describe the investigation in the prompt box. Include the metric, entity, or log attributes you care about, a time range, and the result you want. The workbench chooses the appropriate Dynatrace operation and writes the DQL.

Try prompts such as:

* **Metrics:** `Using Dynatrace, compare average host CPU usage by host over the last hour and identify outliers.`
* **Metric discovery:** `Search Dynatrace for metric keys containing "container.memory" and summarize what each one measures.`
* **Log volume:** `Count Dynatrace error logs from the prod namespace in 5-minute buckets over the last 2 hours.`
* **Dashboards:** `List the Dynatrace dashboards with "checkout" in the name and summarize the tiles on the first one.`
* **Monitors:** `List Dynatrace metric events related to CPU and describe their thresholds.`

Use DQL when you need precise results. For example, include `timeseries avg(dt.host.cpu.usage), by:{dt.entity.host}, from:-2h` in a metrics prompt, or `fetch logs | filter loglevel == "ERROR"` in a log aggregation prompt.

Submit the job and watch its activity stream. To verify the integration, confirm that the job completes, open its Dynatrace tool activity, and check that the call succeeded and returned data. A tool activity entry can also contain an API error, so its presence alone does not verify the connection. For more about job output, see [Running workbench jobs](/plural-features/workbenches/running-jobs).

## Query behavior and limits

Keep these behaviors in mind:

* **The timeframe for metrics lives in the DQL.** Metric queries must start with `timeseries` and put the timeframe and interval in the query, for example `from:-1h` or `interval:5m`. The separate step and time range parameters are not used.
* **Logs and traces also expect the timeframe and limit in the DQL**, such as `fetch logs, from:-1h | limit 100` or `fetch spans, from:-30m | limit 50`. A separate limit parameter is rejected.
* **Log aggregation uses the time range parameter.** Plural sends it as the query's default timeframe, and uses the last 60 minutes when none is given. Bucket sizes use duration syntax such as `30s`, `5m`, or `1h`. The query must start with `fetch logs`.
* **Log aggregation facets** become DQL filters such as ``filter `k8s.namespace.name` == "prod"``. Multiple facets are combined with `or` unless the agent requests `and`.
* **Metric label search is not supported.** Ask for dimensions directly in a `timeseries ... by:{...}` query instead.
* **Metric search needs search text** and returns up to 200 metric keys by default.
* **Dashboard and monitor searches** return 25 results per page by default, up to 100, with a cursor for further pages.

## Troubleshooting

### Authentication or permission errors

* Confirm that **URL** is your environment's `apps.dynatrace.com` platform URL, without a trailing path.
* For a `401` or `403` response, verify that the token has not expired and includes the scopes for the operation that failed.
* Remember that a platform token cannot exceed its owner's permissions. If the scopes are correct but queries still fail or omit data, check the owner's IAM policies for bucket and table access.
* To rotate the token, open **Workbenches → Configured Tools**, select **Edit configuration**, and enter the replacement token. Existing token values are never displayed.

### A query is rejected

* `invalid query: must start with 'timeseries'`, `'fetch logs'`, or `'fetch spans'` means the DQL used the wrong command for the operation. Ask for the matching command in your prompt.
* `unsupported use of 'step'` or `unsupported use of 'limit'` means a parameter was sent separately. Ask for the interval or `| limit` inside the DQL.
* `unsupported use of 'range'` on a log search or trace query is the known limitation described in [Capabilities](#capabilities). Use log aggregation or metrics for the investigation instead.
* `metrics_label_search not supported for this provider` is expected. Use a `timeseries` query with `by:{...}` instead.

### No data is returned

* Run the same DQL in a Dynatrace notebook to confirm that data exists for the same timeframe.
* Check that the timeframe in the DQL, or the time range for log aggregation, covers the period you expect.
* Confirm that the token owner can read the buckets that hold the data.
* Confirm that the required capability is enabled on the configured tool and that the tool is attached to the workbench.

### The Dynatrace tool is unavailable

* Confirm that the tool appears under **Workbenches → Configured Tools**.
* Verify that your user or group has read access to the configured tool.
* Reopen the workbench's **Tools** dialog and confirm that the Dynatrace connection is selected.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
* [Running workbench jobs](/plural-features/workbenches/running-jobs)
