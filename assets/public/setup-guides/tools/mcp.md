# Generic MCP server setup

Use this integration to connect Workbench agents to an MCP server that is not covered by another Plural tool integration.

## Requirements

- The MCP server must expose a reachable HTTP endpoint (SSE or streamable HTTP transport).
- Plural must be able to reach that endpoint over the network from wherever Console is hosted (for example, your cluster or SaaS deployment).
- If the server requires authentication, add the necessary headers when creating the MCP server connection.

## Setup

1. Create or select an MCP server with the server URL and any required auth headers.
2. Create a Workbench tool that references that MCP server.
3. Add the tool to a Workbench. The agent will discover and use tools exposed by the MCP server at runtime.
