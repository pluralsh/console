---
title: HTTP
description: Call a custom HTTP endpoint from a workbench
---

The HTTP tool turns one HTTP endpoint into a tool the workbench agent can call. You fix the URL, method, and headers when you configure the tool, describe the arguments the agent may supply with a JSON schema, and optionally write a request body template that Plural renders from those arguments. Use it for internal APIs and other endpoints that no dedicated Plural integration covers.

In Console, this integration appears as the **Custom** card. For the complete list of integrations and general tool behavior, see [Workbench tools](/plural-features/workbenches/integrations/tools).

## Prerequisites

Before you begin, make sure you have:

* An HTTP endpoint that Plural Console can reach over the network.
* Credentials for that endpoint, if it requires authentication, that can be sent as a static request header, such as a bearer token, a Basic authorization value, or an API key header.
* Permission in Plural Console to create a configured tool and edit the target workbench.
* An existing workbench, or permission to create one. See [Setting up a workbench](/plural-features/workbenches/configuration).

### Prepare credentials

Create credentials for a dedicated integration account rather than a personal one. Prefer read-only roles or scopes, and restrict the account to the endpoints and resources this tool needs. The agent can call the tool with any arguments your input schema allows, so the credentials define the limit of what it can do.

## Capabilities

Each configured HTTP tool gives the agent one operation, `http_integration`. The agent sees it with a description that names the tool, its method, and its URL, for example `The orders HTTP integration tool, which makes a GET request to https://api.example.com/orders/search with the given input.` Use a tool name and schema descriptions that tell the agent when to call it and what each argument means.

When the agent calls the tool:

1. Plural validates the arguments against your **Input schema (JSON)**. A call that does not match is rejected before any request is sent.
2. If you configured a **Body**, Plural renders it as a [Liquid](https://shopify.github.io/liquid/) template, with the validated arguments available as `input`.
3. Plural sends one request with the configured method, URL, headers, and rendered body.
4. The agent receives the raw response body and the HTTP status code.

Only the body is templated. The URL and header values are sent exactly as you configure them, so the agent cannot change the target URL, path, query string, or credentials.

## Create the HTTP tool

1. In Plural Console, open **Workbenches → Integrations**.
2. Find the **Custom** card and click **Add tool**.

### Configure the request

On the **Configuration** step, enter:

* **Name** — the tool name, such as `orders_search`. It must start with a lowercase letter, end with a letter or number, and contain only lowercase letters, numbers, dots, and underscores. The agent sees this name, so make it descriptive.
* **URL** — the full endpoint URL, including any fixed query string.
* **Method** — `GET`, `POST`, `PUT`, `PATCH`, or `DELETE`. The default is `GET`. Use `GET` for read-only endpoints.
* **Headers** — click **Add header** for each header to send, such as `Authorization` or `Content-Type`. Each header needs a name and a value.
* **Body** — an optional request body template. Leave it empty to send no body.
* **Input schema (JSON)** — a [JSON Schema](https://json-schema.org/) object that describes the arguments the agent provides. This field is required and must be valid JSON Schema.

Plural does not set a content type for the body. If the endpoint expects JSON, add a `Content-Type: application/json` header.

Click **Next**.

{% callout severity="warning" %}
Header values are stored as plain configuration, not as encrypted secrets. Anyone with read access to the configured tool can see them when viewing or editing the tool. Restrict the tool's access policy accordingly, use a dedicated low-privilege credential, and never include credential values in screenshots, workbench prompts, or job output.
{% /callout %}

### Write the input schema and body

The input schema describes an object. Its properties are the arguments the agent fills in, and you reference them in the body as `{{ input.<property> }}`. For example, this schema accepts a search term and an optional result limit:

```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Order ID, customer email, or free-text search term"
    },
    "limit": {
      "type": "integer",
      "description": "Maximum number of orders to return",
      "minimum": 1,
      "maximum": 50
    }
  },
  "required": ["query", "limit"]
}
```

With **Method** set to `POST`, a matching body template is:

```liquid
{"query": "{{ input.query }}", "limit": {{ input.limit }}}
```

Keep these rendering rules in mind:

* The template is rendered in strict mode. A reference to a variable the arguments do not contain, or to an unknown filter, fails the call with a `could not render request body` error. Mark every property the body uses as `required`, or guard optional ones with Liquid conditionals such as `{% if input.limit %}`.
* Values are inserted as plain text without JSON escaping. A string that contains a double quote or backslash produces invalid JSON. Constrain string arguments with schema keywords such as `enum`, `pattern`, or `format` where possible.
* A `GET` tool usually has no body. The agent's arguments are still validated, but because the URL is fixed, they do not change the request unless the body uses them.

### Configure access

On the **Access policy** step, add the users or groups that should have read or write access to this configured tool:

* **Read permissions** control who can access and attach the tool to a workbench.
* **Write permissions** control who can modify the tool configuration and access policy.

Click **Save**. After the creation confirmation appears, the tool is available under **Workbenches → Configured Tools**.

## Attach the tool to a workbench

You can attach the tool while creating a workbench or add it to an existing one.

### New workbench

On the final **Attach tools** step of the workbench wizard:

1. Click **Add tools**.
2. Select the HTTP tool by its configured name.
3. Complete the wizard by clicking **Create workbench**.

### Existing workbench

1. Open the workbench.
2. In the left sidebar, find **Tools** and click **Add tools**. You can also open the overflow menu and select **Tools**.
3. In **Add or remove tool from workbench**, select the HTTP tool.
4. Click **Save**.

The configured HTTP tool now appears in the workbench's **Tools** section.

## Use the tool from a workbench

Open the workbench's **Launch** tab and describe the task in the prompt box. Mention the tool by name or describe the data it returns, and include the values the agent needs to fill in the arguments.

Try prompts such as:

* `Use the orders_search tool to look up orders for customer jane@example.com and summarize any that failed payment.`
* `Search orders for "INC-4821" with a limit of 10 and list their current status.`

Submit the job and watch its activity stream. To verify the integration, open the HTTP tool activity and check the status code and response body. A completed call can still contain an error status from the endpoint, so the presence of an activity alone does not verify the connection. For more about job output, see [Running workbench jobs](/plural-features/workbenches/running-jobs).

## Request behavior and limits

* **One endpoint per tool.** Create a separate HTTP tool for each endpoint or method the agent needs.
* **Timeouts.** Connecting and waiting for the response each time out after 10 seconds.
* **No retries or redirects.** A failed request is not retried, and a `3xx` response is returned to the agent as-is rather than followed.
* **Status codes are not errors.** Any response, including `4xx` and `5xx`, is returned to the agent with its status code. Only connection failures, timeouts, and body rendering failures are reported as tool errors.
* **Raw responses.** The response body is passed to the agent as text without parsing. Prefer endpoints that return compact responses, since a large body consumes the agent's context.
* **Read-only classification.** Coding agents reach workbench tools through the workbench's MCP endpoint, which exposes only read-only tools. An HTTP tool counts as read-only only when its method is `GET`, so tools with other methods are not available there.

## Troubleshooting

### Arguments are rejected

* A `not a valid input` error means the agent's arguments did not match the input schema. Check the schema's `required` list, types, and constraints, and add descriptions that make the expected values clear.
* If Console will not let you continue past **Configuration**, confirm that **Input schema (JSON)** contains valid JSON and a valid JSON Schema.

### The body cannot be rendered

* A `could not render request body` error means the template references an argument that was not supplied, uses an unknown filter, or has invalid Liquid syntax. Make every referenced property required, or wrap optional ones in `{% if %}` blocks.

### The endpoint returns an error status

* For `401` or `403`, confirm the header name and value, for example `Authorization: Bearer <token>`, and that the credential has access to the endpoint.
* For `400` or `415`, confirm the rendered body is valid for the endpoint and that a `Content-Type` header is set.
* For a `3xx` status, update **URL** to the final location, because redirects are not followed.

### The request fails or times out

* Confirm that the URL is reachable from where Plural Console runs, including DNS, firewalls, and TLS certificates.
* Responses that take longer than 10 seconds fail. Narrow the request or point the tool at a faster endpoint.

### The tool is unavailable

* Confirm that the tool appears under **Workbenches → Configured Tools**.
* Verify that your user or group has read access to the configured tool.
* Reopen the workbench's **Tools** dialog and confirm that the HTTP tool is selected.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
* [Running workbench jobs](/plural-features/workbenches/running-jobs)
