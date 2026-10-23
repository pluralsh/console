---
title: Elasticsearch
description: Query and search an Elasticsearch cluster from a workbench
---

The Elasticsearch tool gives a workbench read-only access to logs and documents stored in an Elasticsearch index. The agent queries the index using Elasticsearch's query syntax and can retrieve individual log entries or aggregate log counts over time.

## Prerequisites

Before you begin, make sure you have:

* An Elasticsearch cluster that is already indexing the logs you want the workbench to query.
* Permission in Plural Console to create a configured tool and edit the target workbench.
* The Elasticsearch base URL.
* The index name or pattern to query (for example `logs-*`).
* A dedicated Elasticsearch user with appropriate permissions (see below).
* An existing workbench, or permission to create one. See [Setting up a workbench](/plural-features/workbenches/configuration).

### Create an Elasticsearch user and role

Create a dedicated role scoped to the indices this tool should query. The role requires these index privileges:

* `read` — required to search the index
* `view_index_metadata` — required to inspect index structure

Optionally, add the `monitor` cluster privilege if your deployment requires cluster metadata access.

Create a service user and assign the role above. Save the username and password for the Console configuration step.

## Capabilities

The Elasticsearch tool supports two read-only operations:

* **Query logs** — search log entries in the configured index using text queries and exact-match facets. Queries analyze the `message` field only. Results are capped at 500 log entries.
* **Aggregate logs** — count log entries in time buckets using the `@timestamp` field for trend analysis and volume monitoring.

The tool does not create, modify, or delete indices, documents, or Elasticsearch configuration.

## Create the Elasticsearch tool

1. In Plural Console, open **Workbenches → Integrations**.
2. Find the **Elasticsearch** card and click **Add tool**.

### Configure the connection

On the **Configuration** step, enter:

* **Name** — a recognizable name for the connection, such as `elasticsearch-production`.
* **URL** — the Elasticsearch base URL, for example `https://elasticsearch.example.com:9200`.
* **Index** — the index name or pattern to query, such as `logs-*` or `application-logs`.
* **Username** — the dedicated service user username.
* **Password** — the service user password.

Click **Next**.

### Configure access

On the **Access policy** step, add the users or groups that should have read or write access to this configured tool:

* **Read permissions** control who can access and attach the tool to a workbench.
* **Write permissions** control who can modify the tool configuration and access policy.

Click **Save**. After the creation confirmation appears, the connection is available under **Workbenches → Configured Tools**.

## Attach Elasticsearch to a workbench

You can attach the tool while creating a workbench or add it to an existing one.

### New workbench

On the final **Attach tools** step of the workbench wizard:

1. Click **Add tools**.
2. Select the Elasticsearch connection by its configured name.
3. Complete the wizard by clicking **Create workbench**.

### Existing workbench

1. Open the workbench.
2. In the left sidebar, find **Tools** and click **Add tools**. You can also open the overflow menu and select **Tools**.
3. In **Add or remove tool from workbench**, select the Elasticsearch connection.
4. Click **Save**.

The configured Elasticsearch tool now appears in the workbench's **Tools** section.

## Query Elasticsearch from a workbench

Open the workbench's **Launch** tab and describe the investigation in the prompt box. Include the search terms, any field filters, a time range, and what you want to find. The workbench chooses the appropriate Elasticsearch operation; there is no separate Elasticsearch query builder in Console.

Try prompts such as:

* `Using Elasticsearch, find error messages in the last hour and summarize the most common ones.`
* `Search Elasticsearch for logs containing "timeout" in the last 30 minutes. Group by cluster and show counts.`
* `Using Elasticsearch, aggregate log volume by hour over the last 24 hours and identify any unusual spikes.`

You can include specific field filters in prompts, for example `cluster.name.keyword="prod-us-east"` or `kubernetes.namespace.keyword="checkout"`.

Submit the job and watch its activity stream. To verify the integration, confirm that the job completes, open its Elasticsearch tool activity, and check that the call succeeded and returned log data. A tool activity entry can also contain an API error, so its presence alone does not verify the connection. For more about job output, see [Running workbench jobs](/plural-features/workbenches/running-jobs).

## Query behavior and limits

The Elasticsearch tool is read-only. It cannot create, modify, or delete indices, documents, or cluster configuration.

Keep these query behaviors in mind:

* Text queries analyze the `message` field only. Terms in the query are combined using the OR operator by default, so a query for `error timeout` returns logs containing either "error" or "timeout".
* Use an empty query or `*` to match all log messages within the time range and facet filters.
* Facets are exact-match term filters and are combined with AND. Use the mapped field name, typically a keyword field such as `cluster.name.keyword` or `kubernetes.namespace.keyword`. Non-keyword fields may not produce exact matches.
* Log queries return a maximum of 500 entries. Use explicit time ranges and facet filters to narrow results.
* Aggregations use the `@timestamp` field. Ensure your index includes this field with the correct date mapping.
* Specify explicit time ranges for predictable results. The default time range covers recent logs when no range is supplied.

## Troubleshooting

### Authentication or permission errors

* Verify that the **URL** is correct and reachable from the Plural workbench environment.
* Confirm that the username and password belong to an Elasticsearch user with the required role.
* Check that the role has `read` and `view_index_metadata` privileges on the configured index.
* If your deployment requires cluster metadata access, add the `monitor` cluster privilege to the role.
* To rotate credentials, open **Workbenches → Configured Tools**, select **Edit configuration**, and enter the replacement username and password. Existing secret values are never displayed.

### No data is returned

* Verify in Elasticsearch that the expected logs exist in the configured index for the same query and time range.
* Confirm that the **Index** field matches the index name or pattern where your logs are stored.
* Check that the index contains a `message` field for text queries and an `@timestamp` field for time-based filtering and aggregations.
* Include an explicit time range and check facet field names for spelling or case mismatches. Use keyword fields for exact-match facets.
* Confirm that the tool is attached to the workbench by opening the workbench's **Tools** dialog.

### A query fails or returns incomplete results

* Open the failed Elasticsearch activity in the job and inspect the error message before retrying.
* Verify field names for facets. Use `.keyword` suffix for text fields that are mapped as both `text` and `keyword` (for example `cluster.name.keyword`).
* Remember that text queries match the `message` field with OR logic. Use facets for precise filtering on other fields.
* Results are capped at 500 log entries. Use narrower time ranges or more specific facets if the result set is incomplete.
* If the time range produces no results, verify that the index uses the `@timestamp` field and that it contains data for the requested period.

### The Elasticsearch tool is unavailable

* Confirm that the tool appears under **Workbenches → Configured Tools**.
* Verify that your user or group has read access to the configured tool.
* Reopen the workbench's **Tools** dialog and confirm that the Elasticsearch connection is selected.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
