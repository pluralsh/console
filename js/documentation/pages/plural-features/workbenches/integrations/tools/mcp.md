---
title: MCP
description: Connect a workbench to a Model Context Protocol server
---

The MCP tool connects a workbench agent to a [Model Context Protocol](https://modelcontextprotocol.io) server that no other Plural integration covers. Plural connects to the server over the streamable HTTP transport, lists the tools it exposes, and offers each of them to the agent with the name, description, and input schema the server publishes.

The tool has two parts. An **MCP server** stores the endpoint URL and authentication and can be shared by several configured tools. The **MCP tool** references one server and decides which workbench subagents can use its tools. For the complete list of integrations and general tool behavior, see [Workbench tools](/plural-features/workbenches/integrations/tools).

## Prerequisites

Before you begin, make sure you have:

* An MCP server that supports the streamable HTTP transport. Servers that only offer the legacy HTTP+SSE transport are not supported.
* Network access from wherever Plural Console runs to the server's endpoint.
* The server's credentials, if it requires authentication: static header values such as an API key, or OAuth 2.0 client credentials for a token endpoint.
* Permission in Plural Console to create a configured tool and edit the target workbench.
* An existing workbench, or permission to create one. See [Setting up a workbench](/plural-features/workbenches/configuration).

Use credentials for a dedicated integration identity with only the access the agent needs. The agent can call every tool the server lists, with any arguments the server accepts.

## Capabilities

The agent's operations are the tools the MCP server exposes. Plural adds no operations of its own. Each server tool appears to the agent as `mcp_<tool name>_<server tool>`, where `<tool name>` is the configured tool's name and `<server tool>` is the name the server reports.

Plural lists the server's tools when a job starts. Tools the server adds later become available to the next job. When the agent calls a tool, Plural forwards the arguments unchanged and returns the text content of the result to the agent. Non-text content, such as images or embedded resources, is dropped.

Plural does not limit which of the server's tools the agent can call. If a server exposes tools that change data, scope its credentials so those changes are acceptable, or deny calls to those tools by name with a [workbench policy](/plural-features/policy-management/workbench-policies).

## Create the MCP server

You can create the server from the tool form, or reuse one that already exists.

1. In Plural Console, open **Workbenches → Integrations**.
2. Find the **MCP** card and click **Add tool**.
3. Under **MCP server**, click **Create new MCP server**.

On the **New MCP server** form, enter:

* **Name** — a recognizable name for the server.
* **URL** — the server's MCP endpoint, such as `https://example.com/mcp`.
* **Headers** — optional request headers, such as `Authorization` or `x-api-key`. Click **Add header** for each one. Header values are stored as secrets and are not shown after you save.
* **OAuth token exchange** — optional. Turn on **Enable OAuth client credentials** to have Plural obtain an access token from an OAuth 2.0 token endpoint. See [OAuth client credentials](#oauth-client-credentials).
* **Read permissions** — the users or groups that can read this MCP server.

Click **Save**. Console returns to the tool form with the new server selected.

{% callout severity="warning" %}
Plural connects to the URL you enter after removing a trailing `/mcp`, then appends `/mcp`. An endpoint that ends in `/mcp` is used as entered. For any other URL, Plural connects to that URL with `/mcp` appended, so `https://example.com/api` becomes `https://example.com/api/mcp`. Point the server at an endpoint whose path ends in `/mcp`.
{% /callout %}

### OAuth client credentials

When you enable OAuth token exchange, Plural requests an access token with the client credentials grant and sends it as `Authorization: Bearer <token>`. Enter:

* **Client authentication method** — **Client secret**, or **Signed JWT client assertion** to authenticate with an RS256-signed JWT.
* **Token endpoint URL** — the OAuth 2.0 token endpoint, such as `https://identity.example.com/oauth2/token`.
* **Client ID** — the client identifier registered with the identity provider.
* **Client secret** — for the client secret method.
* **RSA private key**, and optionally **Key ID** and **Audience** — for the signed JWT method. **Audience** defaults to the token endpoint URL.
* **Resource** and **Scopes** — optional parameters sent to the token endpoint. Separate scopes with spaces.

{% callout severity="warning" %}
When OAuth token exchange is enabled, Plural sends only the exchanged `Authorization` header. Static **Headers** on the same server are not sent. If the server needs both, it cannot be configured this way.
{% /callout %}

### Servers registered as Kubernetes resources

You can also register MCP servers with the `MCPServer` custom resource described in [Flow MCP servers](/plural-features/flows/mcp). If the resource sets `authentication.plural: true`, workbench connections send a Plural-signed JWT as the `Authorization` header, alongside any static headers. The JWT identifies the Console bot user, not the user who started the job, because one connection is shared by every job that uses the server. See [MCP server authentication](/plural-features/flows/mcp-auth) for how a server verifies these tokens.

## Create the MCP tool

On the **Configuration** step of the tool form, enter:

* **Name** — the tool name, such as `internal_docs`. It must start with a lowercase letter, end with a letter or number, and contain only lowercase letters, numbers, dots, and underscores. It becomes part of each operation name the agent sees.
* **MCP server** — the server to connect to.
* **Subagent Selection** — the workbench subagents that receive the server's tools: **Integration**, **Observability**, **Infrastructure**, **Coding**, or **Verification**. **Integration** is selected by default. Choose the subagents whose work the server's tools support, for example **Observability** for a server that queries monitoring data.

Click **Next**.

### Configure access

On the **Access policy** step, add the users or groups that should have read or write access to this configured tool:

* **Read permissions** control who can access and attach the tool to a workbench.
* **Write permissions** control who can modify the tool configuration and access policy.

Click **Save**. After the creation confirmation appears, the tool is available under **Workbenches → Configured Tools**.

## Attach the MCP tool to a workbench

You can attach the tool while creating a workbench or add it to an existing one.

### New workbench

On the final **Attach tools** step of the workbench wizard:

1. Click **Add tools**.
2. Select the MCP tool by its configured name.
3. Complete the wizard by clicking **Create workbench**.

### Existing workbench

1. Open the workbench.
2. In the left sidebar, find **Tools** and click **Add tools**. You can also open the overflow menu and select **Tools**.
3. In **Add or remove tool from workbench**, select the MCP tool.
4. Click **Save**.

The configured MCP tool now appears in the workbench's **Tools** section.

## Use the tool from a workbench

Open the workbench's **Launch** tab and describe the task in the prompt box. The agent chooses among the server's tools using their descriptions, so name the system or data you want and include identifiers the server's tools expect.

Try prompts such as:

* `Using the internal_docs MCP server, find the runbook for the payments service and summarize the rollback steps.`
* `Look up the on-call owner for the checkout service with the service catalog tools and include their escalation policy.`

Submit the job and watch its activity stream. To verify the integration, open an MCP tool activity and check that the call succeeded and returned data. For more about job output, see [Running workbench jobs](/plural-features/workbenches/running-jobs).

## Connection behavior

* **One shared connection per server.** Every job and tool that uses the same MCP server shares one client connection. Changing the server's URL or authentication replaces the connection on next use.
* **Tool discovery at job start.** Tools are listed when a job starts. If listing fails, the job runs without that server's tools rather than failing.
* **Text results only.** The agent receives the concatenated text parts of each result.

## Troubleshooting

### The agent does not see the server's tools

* Confirm that the server supports the streamable HTTP transport and that its endpoint path ends in `/mcp`.
* Confirm that Plural Console can reach the URL, including DNS, firewalls, and TLS certificates.
* Check that the server's headers or OAuth settings are correct. An authentication failure during discovery leaves the job without the server's tools.
* Confirm that **Subagent Selection** includes the subagent doing the work.

### Authentication errors

* For static headers, re-enter the header value. Saved values are masked, and leaving the mask unchanged keeps the stored value.
* For OAuth, confirm the token endpoint URL, client ID, and secret or private key, and that the client is allowed the client credentials grant. If you also configured static headers, remember they are not sent while OAuth is enabled.
* An OAuth token exchange failure prevents Plural from connecting to the server at all.

### A tool call fails

* Open the failed activity in the job. Plural reports the server's error as `MCP Server tool <name> for <tool> has error`.
* Call the same tool with the same arguments from another MCP client to separate server problems from workbench problems.

### The MCP tool is unavailable

* Confirm that the tool appears under **Workbenches → Configured Tools**.
* Verify that your user or group has read access to the configured tool.
* Reopen the workbench's **Tools** dialog and confirm that the MCP tool is selected.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
* [Flow MCP servers](/plural-features/flows/mcp)
* [MCP server authentication](/plural-features/flows/mcp-auth)
