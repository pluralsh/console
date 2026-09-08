---
title: Flow MCP Servers
description: Integrate Plural AI with MCP to securely automate operations
---

# Overview

Plural Flows natively integrate with [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction) to become a portal to manage common operational tasks with AI.  When registered, Flow chats will automatically be able to call the MCP server via tool-calling.  Common usecases of this are:

* Implement ops tasks in a flow chat.  Some examples: manually adding users to a custom payment plan, seeing basic account details, etc.
* Exploring a read-only database connection with the [Postgres MCP server](https://github.com/modelcontextprotocol/servers/tree/main/src/postgres)
* Querying data from JIRA/ServiceNow, etc to enhance AI context
* Converting Flows into your developer admin panel, with a cleaner security model than a no-code tool or a poorly maintained internal UI. 

Anthropic has a large [library](https://github.com/modelcontextprotocol/servers) of pre-built servers, and there's a rapidly growing open source community building more.  In theory the protocol could support any external data-fetching needed to enhance an AI experience.

In addition to the base value of MCP though, Plural adds a few core governance features on top:

* Audit Logging of all MCP server calls
* Confirmation workflows in case you want to ensure user confirmation before the AI initiates an MCP tool-call
* Authentication via JWT to end MCP servers, making it easy for developers to implement auth + authz and securing their server code
* Permissions as to who can access an MCP server within the Plural experience

## Registering an MCP server

The yaml for this is relatively simple:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: MCPServer
metadata:
  name: plural
spec:
  name: plural
  confirm: false
  url: https://plural-mcp.plural.sh
  authentication:
    plural: true
  bindings:
    write:
    - groupName: sre # only this group can bind this server to their Flows
```

From there, if a developer has sufficient permissions, they can associate their Flow within the Plural UI with the MCP server by going to `MCP Connections` and clicking `Change MCP Connections`, like so:

![](/assets/flows/mcp-connection.png)

Once the server is registered, you'll be able to see the MCP server in your Flow AI chat, like so:

![](/assets/flows/mcp-server.png)

{% callout severity="info" %}
If you don't see any tools listed, it's highly likely there's a networking issue between Plural and your server, or the server is not properly broadcasting tools on its SSE endpoint.
{% /callout %}