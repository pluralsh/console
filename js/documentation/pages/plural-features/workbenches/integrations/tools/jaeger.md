---
title: Jaeger
description: Query distributed traces from a Jaeger backend
---

The Jaeger tool lets a workbench agent query distributed traces from a Jaeger backend. Configure the connection once, then attach it to the workbenches that should use it.

## Prerequisites

Before you begin, make sure you have:

* A deployed Jaeger instance with an accessible query API endpoint (for example, a `jaeger-query` service or ingress).
* Permission in Plural Console to create a configured tool and edit the target workbench.
* Optional: credentials if your Jaeger deployment uses basic authentication or bearer token authentication.
* An existing workbench, or permission to create one. See [Setting up a workbench](/plural-features/workbenches/configuration).

## Capabilities

The Jaeger tool is read-only and provides one operation:

* **Query traces** — search for distributed trace spans by service name, operation name, duration range, span attributes, and time range. Results are individual spans, not reconstructed trace trees.

Grant the Jaeger credentials read-only query access. Write or administrative permissions are not required.

## Create the Jaeger tool

1. In Plural Console, open **Workbenches → Integrations**.
2. Find the **Jaeger** card and click **Add tool**.

### Configure the connection

On the **Configuration** step, enter:

* **Name** — a recognizable name for the connection, such as `jaeger-staging`.
* **URL** — the Jaeger query base URL, for example `http://jaeger-query.monitoring.svc:16686`.
* **Username** — optional basic authentication username.
* **Password** — optional basic authentication password.
* **Bearer token** — optional bearer token for token-based authentication.

Provide credentials only when your Jaeger deployment enforces authentication. If you configure both basic auth and a bearer token, the bearer token takes precedence.

Click **Next**.

{% callout severity="warning" %}
Treat credentials as secrets. Plural stores them encrypted and does not display them after saving. Never include credential values in screenshots, workbench prompts, or job output.
{% /callout %}

### Configure access

On the **Access policy** step, add the users or groups that should have read or write access to this configured tool:

* **Read permissions** control who can access and attach the tool to a workbench.
* **Write permissions** control who can modify the tool configuration and access policy.

Click **Save**. After the creation confirmation appears, the connection is available under **Workbenches → Configured Tools**.

## Attach Jaeger to a workbench

You can attach the tool while creating a workbench or add it to an existing one.

### New workbench

On the final **Attach tools** step of the workbench wizard:

1. Click **Add tools**.
2. Select the Jaeger connection by its configured name.
3. Complete the wizard by clicking **Create workbench**.

### Existing workbench

1. Open the workbench.
2. In the left sidebar, find **Tools** and click **Add tools**. You can also open the overflow menu and select **Tools**.
3. In **Add or remove tool from workbench**, select the Jaeger connection.
4. Click **Save**.

The configured Jaeger tool now appears in the workbench's **Tools** section.

## Query Jaeger from a workbench

Open the workbench's **Launch** tab and describe the investigation in the prompt box. Include the service name, relevant filters (operation, duration, attributes), and a time range. The workbench agent automatically constructs the Jaeger query.

Try prompts such as:

* `Search Jaeger for traces from the checkout service over the last 30 minutes. Find spans with errors and summarize the affected operations.`
* `Using Jaeger, query the api-gateway service for spans with operation GET /orders that took longer than 500ms during the last hour.`
* `Find traces from the payment service in Jaeger where the http.status_code attribute is 500, over the last 2 hours.`
* `Query Jaeger for the slowest spans from the inventory service during the last 30 minutes. Show their durations and parent operations.`

Include specific operation names, duration constraints, and span attributes when you need precise filtering. Always provide or imply a time range for predictable results.

Submit the job and watch its activity stream. To verify the integration, confirm that the job completes, open its Jaeger tool activity, and check that the call succeeded and returned trace data. A tool activity entry can also contain an API error, so its presence alone does not verify the connection. For more about job output, see [Running workbench jobs](/plural-features/workbenches/running-jobs).

## Query behavior

The Jaeger tool is read-only. It cannot create, modify, or delete traces.

Keep these query behaviors in mind:

* **Service name is required** — every query must specify a service name (the `query` parameter).
* **Time range is required** — provide an explicit time range in your prompt (for example, "last 30 minutes" or "between 2pm and 3pm today"). Queries without a time range fail.
* **Results are spans** — the tool returns individual trace spans with their trace ID, span ID, parent ID, service, operation name, start and end timestamps, and tags. It does not reconstruct full trace trees or hierarchies.
* **Optional filters** — you can narrow results with operation name, minimum and maximum duration (for example, `10ms`, `1.5s`), and dynamic span attributes (key-value tag pairs).
* **Limit parameter** — the agent can request a maximum number of traces. The default is 100, but Jaeger may impose its own limits.

## Troubleshooting

### Authentication or connection errors

* Confirm that the **URL** points to the Jaeger query API and is reachable from the Plural environment.
* If your Jaeger deployment requires authentication, verify that **Username** and **Password** or **Bearer token** are configured correctly.
* Use HTTPS and a properly configured ingress or service endpoint when accessing Jaeger over the network.
* To rotate credentials, open **Workbenches → Configured Tools**, select **Edit configuration**, and enter the replacement secret. Existing secret values are never displayed.

### No data is returned

* Verify in Jaeger that trace data exists for the same service and time range.
* Include an explicit time range in your prompt — queries without a time range are rejected.
* Check the service name for spelling or case-sensitivity mismatches.
* Confirm that the Jaeger tool is attached to the workbench. Open the workbench's **Tools** dialog and verify that the Jaeger connection is selected.

### A query fails or returns incomplete results

* Open the failed Jaeger activity in the job and inspect the API error before retrying.
* Start with a simple query (service name and time range only) and add filters incrementally.
* When filtering by duration, use the protobuf duration format (`10ms`, `1.5s`, `500ms`).
* Verify that span attribute names and values match what is indexed in your Jaeger backend.

### The Jaeger tool is unavailable

* Confirm that the tool appears under **Workbenches → Configured Tools**.
* Verify that your user or group has read access to the configured tool.
* Reopen the workbench's **Tools** dialog and confirm that the Jaeger connection is selected.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
