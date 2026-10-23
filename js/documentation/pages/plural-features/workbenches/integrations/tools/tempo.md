---
title: Tempo
description: Query distributed traces from a Grafana Tempo endpoint
---

The Tempo tool lets a workbench agent query distributed traces from a Grafana Tempo endpoint. Configure the connection once, then attach it to the workbenches that should use it.

## Prerequisites

Before you begin, make sure you have:

* A deployed Grafana Tempo instance with an accessible query API endpoint.
* Permission in Plural Console to create a configured tool and edit the target workbench.
* Optional: credentials if your Tempo deployment uses basic authentication or bearer token authentication.
* Optional: a tenant ID if your Tempo deployment uses multi-tenant routing.
* An existing workbench, or permission to create one. See [Setting up a workbench](/plural-features/workbenches/configuration).

## Capabilities

The Tempo tool is read-only and provides one operation:

* **Query traces** — search for distributed trace spans using provider-specific queries and optional time range filters. Results are individual spans, not reconstructed trace trees.

Grant the Tempo credentials read-only query access. Write or administrative permissions are not required.

## Create the Tempo tool

1. In Plural Console, open **Workbenches → Integrations**.
2. Find the **Tempo** card and click **Add tool**.

### Configure the connection

On the **Configuration** step, enter:

* **Name** — a recognizable name for the connection, such as `tempo-production`.
* **URL** — the Tempo query endpoint base URL.
* **Username** — optional basic authentication username.
* **Password** — optional basic authentication password.
* **Tenant ID** — optional tenant identifier for multi-tenant deployments.
* **Bearer token / API key** — optional bearer token or API key for token-based authentication.

Provide credentials only when your Tempo deployment enforces authentication. If you configure both basic auth and a bearer token, the bearer token takes precedence. Include a **Tenant ID** when your Tempo instance routes queries by tenant header.

Click **Next**.

{% callout severity="warning" %}
Treat credentials as secrets. Plural stores them encrypted and does not display them after saving. Never include credential values in screenshots, workbench prompts, or job output.
{% /callout %}

### Configure access

On the **Access policy** step, add the users or groups that should have read or write access to this configured tool:

* **Read permissions** control who can access and attach the tool to a workbench.
* **Write permissions** control who can modify the tool configuration and access policy.

Click **Save**. After the creation confirmation appears, the connection is available under **Workbenches → Configured Tools**.

## Attach Tempo to a workbench

You can attach the tool while creating a workbench or add it to an existing one.

### New workbench

On the final **Attach tools** step of the workbench wizard:

1. Click **Add tools**.
2. Select the Tempo connection by its configured name.
3. Complete the wizard by clicking **Create workbench**.

### Existing workbench

1. Open the workbench.
2. In the left sidebar, find **Tools** and click **Add tools**. You can also open the overflow menu and select **Tools**.
3. In **Add or remove tool from workbench**, select the Tempo connection.
4. Click **Save**.

The configured Tempo tool now appears in the workbench's **Tools** section.

## Query Tempo from a workbench

Open the workbench's **Launch** tab and describe the investigation in the prompt box. Include the provider-specific query, relevant filters, and a time range. The workbench agent automatically constructs the Tempo query.

Try prompts such as:

* `Search Tempo for traces from the checkout service over the last 30 minutes. Find spans with errors and summarize the affected operations.`
* `Using Tempo, query traces for spans with http.status_code = 500 during the last hour.`
* `Find the slowest traces in Tempo for the api-gateway service during the last 2 hours.`
* `Query Tempo for traces matching service.name = payment and span.kind = server, over the last 30 minutes.`

Include specific search criteria and a time range in your prompt for predictable results. Tempo's query language and filtering capabilities depend on your deployment's configuration and indexed attributes.

Submit the job and watch its activity stream. To verify the integration, confirm that the job completes, open its Tempo tool activity, and check that the call succeeded and returned trace data. A tool activity entry can also contain an API error, so its presence alone does not verify the connection. For more about job output, see [Running workbench jobs](/plural-features/workbenches/running-jobs).

## Query behavior

The Tempo tool is read-only. It cannot create, modify, or delete traces.

Keep these query behaviors in mind:

* **Provider-specific query format** — the query uses the syntax supported by your Tempo endpoint. This varies by version and configuration.
* **Results are spans** — the tool returns individual trace spans with their trace ID, span ID, parent ID, service, operation name, start and end timestamps, and tags. It does not reconstruct full trace trees or hierarchies.
* **Optional time range** — provide an explicit time range in ISO 8601 format (for example, `2023-01-01T00:00:00Z`) for more predictable results. If omitted, the backend may apply its own default window.
* **Limit parameter** — the agent can request a maximum number of traces, but the provider may impose its own limits.

## Troubleshooting

### Authentication or connection errors

* Confirm that the **URL** points to the Tempo query API and is reachable from the Plural environment.
* If your Tempo deployment requires authentication, verify that **Username** and **Password** or **Bearer token / API key** are configured correctly.
* For multi-tenant deployments, ensure the **Tenant ID** matches the tenant you want to query.
* Use HTTPS and a properly configured ingress or service endpoint when accessing Tempo over the network.
* To rotate credentials, open **Workbenches → Configured Tools**, select **Edit configuration**, and enter the replacement secret. Existing secret values are never displayed.

### No data is returned

* Verify in Grafana or the Tempo query UI that trace data exists for the same query and time range.
* Include an explicit time range in your prompt for more predictable filtering.
* Check the query syntax against your Tempo version's documentation.
* Confirm that the Tempo tool is attached to the workbench. Open the workbench's **Tools** dialog and verify that the Tempo connection is selected.

### A query fails or returns incomplete results

* Open the failed Tempo activity in the job and inspect the API error before retrying.
* Start with a simple query and add filters incrementally.
* Verify that attribute names and values match what is indexed in your Tempo backend.
* Check that the time range is formatted correctly (ISO 8601, for example `2023-01-01T00:00:00Z`).

### The Tempo tool is unavailable

* Confirm that the tool appears under **Workbenches → Configured Tools**.
* Verify that your user or group has read access to the configured tool.
* Reopen the workbench's **Tools** dialog and confirm that the Tempo connection is selected.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
