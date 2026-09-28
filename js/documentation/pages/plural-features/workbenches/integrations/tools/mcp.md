---
title: MCP
description: Connect a workbench to a Model Context Protocol server
---

The MCP tool connects a workbench agent to a Model Context Protocol server that is not covered by another Plural tool. Plural reaches the server over HTTP and the agent uses the tools that server exposes.

## Capabilities

* Placeholder: name each operation the agent can call, from `lib/console/ai/tools/workbench/` (and `go/cloud-query/internal/tools/` when the tool is query-backed).
* Placeholder: mention permissions only when the implementation or the setup guide states them.

## Setup

Create the tool under **Workbenches → Integrations** and follow the inline setup guide for credentials and Console fields. That guide is maintained at `js/console/public/setup-guides/tools/mcp.md`.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
