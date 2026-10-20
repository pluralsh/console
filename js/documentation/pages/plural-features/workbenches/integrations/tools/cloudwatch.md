---
title: CloudWatch
description: Connect Amazon CloudWatch to a workbench and query metrics, logs, dashboards, and alarms
---

Use the CloudWatch integration to give a workbench read-only access to the metrics, logs, dashboards, and alarms in one AWS region of your account. After you configure the connection once, you can attach it to one or more workbenches and investigate CloudWatch data with natural-language prompts.

This guide uses the Plural Console UI. For the complete list of integrations and general tool behavior, see [Workbench tools](/plural-features/workbenches/integrations/tools).

## Prerequisites

Before you begin, make sure you have:

* An AWS account whose CloudWatch metrics and CloudWatch Logs contain the data you want the workbench to query.
* The AWS region to query, such as `us-east-1`. Each CloudWatch tool queries a single region.
* An AWS identity with CloudWatch read access. You can use an IAM role that Plural assumes, static access keys, or both. See [Choose how Plural authenticates](#choose-how-plural-authenticates).
* Permission in Plural Console to create a configured tool and edit the target workbench.
* An existing workbench, or permission to create one. See [Setting up a workbench](/plural-features/workbenches/configuration).

### Choose how Plural authenticates

Plural supports these credential setups:

* **Assume a role (preferred).** Enter a **Role ARN**. Plural calls `sts:AssumeRole` on that role, optionally with an **External ID** and **Role session name**. The identity that assumes the role is either the static access keys you enter or, if you leave them empty, the default AWS credentials of Plural's query service (for example, its workload identity in a self-hosted install).
* **Static access keys.** Enter an **Access key ID** and **Secret access key** for a dedicated IAM user. You must set both or neither.

For cross-account access, the role's trust policy must allow the calling identity to perform `sts:AssumeRole`. If you configure an external ID on the trust policy, enter the same value in **External ID**.

{% callout severity="warning" %}
Dashboard and alarm lookups do not assume the **Role ARN**. They use the static access keys when you set them, and otherwise Console's own AWS identity. If you rely only on a role, grant Console's identity CloudWatch read access too, or those lookups fail or return data from the wrong account.
{% /callout %}

### AWS permissions

Attach read-only CloudWatch permissions to the identity Plural uses. The AWS managed policies [`CloudWatchReadOnlyAccess`](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/CloudWatchReadOnlyAccess.html) and `CloudWatchLogsReadOnlyAccess` cover every call the tool makes:

| Capability | AWS API calls |
|---|---|
| **Metrics** | `cloudwatch:GetMetricData`, `cloudwatch:ListMetrics` |
| **Logs** | `logs:StartQuery`, `logs:GetQueryResults` |
| Dashboards | `cloudwatch:ListDashboards`, `cloudwatch:GetDashboard` |
| Alarms | `cloudwatch:DescribeAlarms` |

## Capabilities

The CloudWatch tool is read-only. It cannot create or modify metrics, log groups, dashboards, or alarms.

When **Metrics** is enabled, the workbench agent can call:

* **workbench_observability_metrics** — runs a CloudWatch [metric math expression](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/using-metric-math.html), such as a `SEARCH(...)` expression, through `GetMetricData`. An optional step sets the period.
* **workbench_observability_metric_search** — finds metrics whose namespace, metric name, or dimension name contains the search text. Results use the form `Namespace/MetricName`, for example `AWS/EC2/CPUUtilization`.
* **workbench_observability_metric_label_search** — lists the dimension names of a metric, or the values of one dimension. Pass the metric as `Namespace/MetricName`.

When **Logs** is enabled, the agent can call:

* **workbench_observability_logs** — runs a [CloudWatch Logs Insights](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html) query. An empty query returns the newest events with `fields @timestamp, @message | sort @timestamp desc`.
* **workbench_observability_log_aggregate** — counts matching log events per time bucket by appending `stats count(*) as count by bin(<bucket>)` to the query.

Regardless of the capabilities you enable, the agent can also call:

* **workbench_observability_dashboards** and **workbench_observability_dashboard** — list CloudWatch dashboards whose names start with a given prefix, and fetch one dashboard's full definition by name.
* **workbench_observability_monitors** and **workbench_observability_monitor** — list CloudWatch alarms whose names start with a given prefix, and fetch one alarm by name.

## Create the CloudWatch tool

1. In Plural Console, open **Workbenches → Integrations**.
2. Find the **Cloudwatch** card and click **Add tool**.

### Configure the connection

On the **Configuration** step, enter:

* **Name** — a recognizable name for the connection, such as `cloudwatch_prod`. The name must start with a lowercase letter, end with a letter or number, and contain only lowercase letters, numbers, dots, and underscores.
* **Region** — the AWS region to query, such as `us-east-1`. Required.
* **Role ARN** — optional IAM role for Plural to assume.
* **Role session name** — optional session name used when assuming the role.
* **External ID** — optional external ID required by the role's trust policy.
* **Access key ID** and **Secret access key** — optional static credentials. Set both or leave both empty.
* **Default log groups** — optional log group names, one per line. Log queries run against these groups unless the query selects its own with `SOURCE`.

Under **Allowed capabilities**, select **Metrics**, **Logs**, or both. Both are selected by default.

Click **Next**.

{% callout severity="warning" %}
Treat the secret access key and external ID as secrets. Plural stores them encrypted and does not display them after saving. Never include credential values in screenshots, workbench prompts, or job output.
{% /callout %}

### Configure access

On the **Access policy** step, add the users or groups that should have read or write access to this configured tool:

* **Read permissions** control who can access and attach the tool to a workbench.
* **Write permissions** control who can modify the tool configuration and access policy.

Click **Save**. After the creation confirmation appears, the connection is available under **Workbenches → Configured Tools**.

## Attach CloudWatch to a workbench

You can attach the tool while creating a workbench or add it to an existing one.

### New workbench

On the final **Attach tools** step of the workbench wizard:

1. Click **Add tools**.
2. Select the CloudWatch connection by its configured name.
3. Complete the wizard by clicking **Create workbench**.

### Existing workbench

1. Open the workbench.
2. In the left sidebar, find **Tools** and click **Add tools**. You can also open the overflow menu and select **Tools**.
3. In **Add or remove tool from workbench**, select the CloudWatch connection.
4. Click **Save**.

The configured CloudWatch tool now appears in the workbench's **Tools** section.

## Query CloudWatch from a workbench

Open the workbench's **Launch** tab and describe the investigation in the prompt box. Include the namespace, metric, or log group, any dimension or field filters, a time range, and the result you want. The workbench chooses the appropriate CloudWatch operation.

Try prompts such as:

* **Metrics:** `Using CloudWatch, chart average CPUUtilization for EC2 instances over the last hour and identify instances above 80%.`
* **Metric discovery:** `List the CloudWatch metrics in the AWS/RDS namespace and the dimensions available for DatabaseConnections.`
* **Logs:** `Search the /aws/eks/prod/app log group in CloudWatch for ERROR messages in the last 30 minutes and summarize the most common errors.`
* **Log volume:** `Count CloudWatch log events containing "timeout" in 5-minute buckets over the last 2 hours.`
* **Alarms:** `List CloudWatch alarms whose names start with prod- and summarize their state and thresholds.`

Use CloudWatch syntax when you need precise results. For example, include `SEARCH('{AWS/EC2,InstanceId} MetricName="CPUUtilization"', 'Average', 300)` in a metrics prompt, or `fields @timestamp, @message | filter @message like /ERROR/` in a logs prompt. To query log groups other than the defaults, include a `SOURCE logGroups(namePrefix: ["/aws/lambda/"])` clause.

Submit the job and watch its activity stream. To verify the integration, confirm that the job completes, open its CloudWatch tool activity, and check that the call succeeded and returned data. A tool activity entry can also contain an API error, so its presence alone does not verify the connection. For more about job output, see [Running workbench jobs](/plural-features/workbenches/running-jobs).

## Query behavior and limits

Keep these behaviors in mind:

* Metric, log, and log aggregation queries default to the last 60 minutes when no time range is given. Metrics ranges must be shorter than seven days.
* Log queries need a log group. Set **Default log groups**, or have the query select groups with `SOURCE`. Otherwise the call fails before it reaches AWS.
* Log queries run asynchronously in CloudWatch Logs Insights. Plural polls for results and gives up after about two minutes.
* Facet filters become Logs Insights `filter` clauses, such as `| filter service = "api"`, and are combined with `and`.
* Log aggregation bucket sizes use duration syntax such as `30s`, `5m`, or `1h`.
* Metric search and label search only cover metrics that reported data in the last three hours, and scan a limited number of `ListMetrics` pages. Metric search returns up to 200 names by default and at most 500.
* Dashboard and alarm searches match name prefixes, not substrings.

## Troubleshooting

### Authentication or permission errors

* Confirm that **Region** is set and matches the region that holds your data.
* For an `AccessDenied` error, verify that the identity Plural uses has the CloudWatch and CloudWatch Logs read permissions listed above.
* If you use **Role ARN**, confirm that the role's trust policy allows the calling identity to assume it, and that **External ID** matches the trust policy condition.
* If metrics and logs work but dashboards or alarms fail, remember that those lookups do not assume the role. Add static keys or grant Console's own AWS identity read access.
* To rotate keys, open **Workbenches → Configured Tools**, select **Edit configuration**, and enter the replacement secret. Existing secret values are never displayed.

### Log queries fail or return nothing

* An error saying that log group names must be set or the query must include `SOURCE` means the tool has no **Default log groups** and the query does not select any. Add default log groups, or ask for a `SOURCE` clause in your prompt.
* Confirm that the log groups exist in the configured region and contain events in the requested time range.
* If a query fails with a status such as `Failed` or `Timeout`, check the Logs Insights syntax and narrow the time range or log groups.

### No metrics are returned

* Verify in the CloudWatch console that the same expression returns data for the same period.
* For metric and label search, remember that only metrics active in the last three hours are listed. Query older metrics directly with an expression.
* Check namespace, metric name, and dimension spelling. Metric identifiers for label search must be `Namespace/MetricName`.

### The CloudWatch tool is unavailable

* Confirm that the tool appears under **Workbenches → Configured Tools**.
* Verify that your user or group has read access to the configured tool.
* Reopen the workbench's **Tools** dialog and confirm that the CloudWatch connection is selected.
* Confirm that the capability you need, **Metrics** or **Logs**, is enabled on the configured tool.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
* [Running workbench jobs](/plural-features/workbenches/running-jobs)
