---
title: OpenSearch
description: Search logs and aggregate log counts in an Amazon OpenSearch Service index from a workbench
---

The OpenSearch tool gives a workbench read-only access to logs stored in an Amazon OpenSearch Service domain. The agent searches the configured index with text queries and can retrieve individual log entries or count log entries over time. Plural signs every request with AWS Signature Version 4, using either credentials available to the Console runtime or static access keys.

## Prerequisites

Before you begin, make sure you have:

* An Amazon OpenSearch Service domain that is already indexing the logs you want the workbench to query.
* The domain endpoint, such as `https://search-domain.us-east-1.es.amazonaws.com`.
* The index name or pattern to query, such as `logs-*`.
* The AWS region of the domain, such as `us-east-1`.
* An AWS identity that can search the domain (see below).
* Permission in Plural Console to create a configured tool and edit the target workbench.
* An existing workbench, or permission to create one. See [Setting up a workbench](/plural-features/workbenches/configuration).

### Choose how Plural authenticates

Plural supports two ways to obtain the AWS credentials it signs requests with:

* **Pod identity or IRSA (recommended).** Plural uses credentials already available to the Console runtime, such as EKS Pod Identity, IAM Roles for Service Accounts (IRSA), instance metadata, or another default AWS credential source. No keys are stored in the tool configuration.
* **Static access keys.** Create an IAM user for the integration and generate an access key ID and secret access key.

With either option, you can also set an IAM role for Plural to assume before it signs requests. Use this for cross-account access or to keep the OpenSearch permissions on a dedicated role. The base credentials must be allowed to assume that role, and the role's trust policy must allow them.

### Grant read-only OpenSearch access

The tool sends signed `POST /{index}/_search` requests to the domain. Grant the IAM identity that signs requests, meaning the assumed role if you set one, permission to make that request:

* `es:ESHttpPost` on the search path for the configured index, such as `arn:aws:es:us-east-1:123456789012:domain/my-domain/logs-*/_search`

If the domain uses [fine-grained access control](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/fgac.html), also map the IAM principal to an OpenSearch role with read and search privileges on the same index pattern. For details about domain access policies, see [Identity and Access Management in Amazon OpenSearch Service](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/ac.html).

## Capabilities

The OpenSearch tool supports two read-only operations:

* **workbench_observability_logs** — searches log entries in the configured index with a text query over the `message` field, within a time range.
* **workbench_observability_log_aggregate** — counts matching log entries in fixed time buckets using the `@timestamp` field, for trend analysis and volume monitoring.

The tool does not create, modify, or delete indices, documents, or domain configuration.

## Create the OpenSearch tool

1. In Plural Console, open **Workbenches → Integrations**.
2. Find the **OpenSearch** card and click **Add tool**.

### Configure the connection

On the **Configuration** step, enter:

* **Name** — a recognizable name for the connection, such as `opensearch_prod`. The name must start with a lowercase letter, end with a letter or number, and contain only lowercase letters, numbers, dots, and underscores.
* **Host** — the domain endpoint, such as `https://search-domain.us-east-1.es.amazonaws.com`.
* **Index** — the index name or pattern to query, such as `logs-*`.
* **AWS region** — the domain's region, such as `us-east-1`. You can leave it blank only when the region can be inferred from the runtime's AWS configuration.
* **Assume role ARN** — optional. The IAM role to assume before signing requests, such as `arn:aws:iam::123456789012:role/opensearch-readonly`.
* **Use pod identity / IRSA** — turn this on to use credentials available to the Console runtime.
* **Access key ID** and **Secret access key** — required only when **Use pod identity / IRSA** is off.

Click **Next**.

{% callout severity="warning" %}
Treat static access keys as secrets. Plural stores them encrypted and does not display them after saving. Never include credential values in screenshots, workbench prompts, or job output.
{% /callout %}

### Configure access

On the **Access policy** step, add the users or groups that should have read or write access to this configured tool:

* **Read permissions** control who can access and attach the tool to a workbench.
* **Write permissions** control who can modify the tool configuration and access policy.

Click **Save**. After the creation confirmation appears, the connection is available under **Workbenches → Configured Tools**.

## Attach OpenSearch to a workbench

You can attach the tool while creating a workbench or add it to an existing one.

### New workbench

On the final **Attach tools** step of the workbench wizard:

1. Click **Add tools**.
2. Select the OpenSearch connection by its configured name.
3. Complete the wizard by clicking **Create workbench**.

### Existing workbench

1. Open the workbench.
2. In the left sidebar, find **Tools** and click **Add tools**. You can also open the overflow menu and select **Tools**.
3. In **Add or remove tool from workbench**, select the OpenSearch connection.
4. Click **Save**.

The configured OpenSearch tool now appears in the workbench's **Tools** section.

## Query OpenSearch from a workbench

Open the workbench's **Launch** tab and describe the investigation in the prompt box. Include the search terms, a time range, and what you want to find. The workbench chooses the appropriate OpenSearch operation; there is no separate OpenSearch query builder in Console.

Try prompts such as:

* `Using OpenSearch, find error messages in the last hour and summarize the most common ones.`
* `Search OpenSearch for logs containing "timeout" in the last 30 minutes and list the affected services.`
* `Using OpenSearch, count log volume in 1-hour buckets over the last 24 hours and identify any unusual spikes.`

Submit the job and watch its activity stream. To verify the integration, confirm that the job completes, open its OpenSearch tool activity, and check that the call succeeded and returned log data. A tool activity entry can also contain an API error, so its presence alone does not verify the connection. For more about job output, see [Running workbench jobs](/plural-features/workbenches/running-jobs).

## Query behavior and limits

The OpenSearch tool builds the same search requests as the [Elasticsearch tool](/plural-features/workbenches/integrations/tools/elastic). Keep these behaviors in mind:

* Text queries analyze the `message` field only, and only documents that have a `message` field are returned. Log searches combine query terms with OR, so a query for `error timeout` returns logs containing either "error" or "timeout". Log aggregation also uses OR by default, and the agent can request AND.
* Use an empty query or `*` to match all log messages within the time range.
* Every search is limited to a time range on the `@timestamp` field. When the agent does not specify one, the tool searches the last 60 minutes. Ensure your index includes `@timestamp` with a date mapping.
* The agent can set the number of log entries to return. Without a limit, OpenSearch returns its default number of hits for a search.
* Aggregation bucket sizes use fixed intervals such as `30s`, `5m`, or `1h`.
* Unlike the Elasticsearch tool, the OpenSearch tool does not advertise exact-match field filters to the agent. Put the terms you care about in the search text and narrow the time range instead.

## Troubleshooting

### Authentication or permission errors

* Verify that **Host** is the domain endpoint and is reachable from the Plural workbench environment.
* Confirm that **AWS region** matches the domain's region. A wrong region causes signature errors.
* With **Use pod identity / IRSA** on, confirm that the Console runtime has AWS credentials available. With it off, confirm that both **Access key ID** and **Secret access key** are set.
* If you set **Assume role ARN**, confirm that the base credentials can assume the role and that the role's trust policy allows them.
* For a `403` response, check that the signing identity has `es:ESHttpPost` on the index's `_search` path, and that fine-grained access control maps it to a role that can read the index.
* To rotate static keys, open **Workbenches → Configured Tools**, select **Edit configuration**, and enter the replacement keys. Existing secret values are never displayed.

### No data is returned

* Verify in OpenSearch Dashboards that the expected logs exist in the configured index for the same query and time range.
* Confirm that **Index** matches the index name or pattern where your logs are stored.
* Check that documents contain a `message` field for text queries and an `@timestamp` field for time filtering and aggregations.
* Include an explicit time range in your prompt. Without one, only the last 60 minutes are searched.
* Confirm that the tool is attached to the workbench by opening the workbench's **Tools** dialog.

### A query fails or returns incomplete results

* Open the failed OpenSearch activity in the job and inspect the error message before retrying. Errors from the domain include the HTTP status and the response body.
* Remember that text queries match the `message` field with OR logic. Use more specific terms or a narrower time range to reduce noise.
* If the result set looks truncated, ask for a larger number of log entries or a narrower time range.

### The OpenSearch tool is unavailable

* Confirm that the tool appears under **Workbenches → Configured Tools**.
* Verify that your user or group has read access to the configured tool.
* Reopen the workbench's **Tools** dialog and confirm that the OpenSearch connection is selected.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
* [Elasticsearch](/plural-features/workbenches/integrations/tools/elastic)
* [Running workbench jobs](/plural-features/workbenches/running-jobs)
