---
title: HTTP
description: Call a custom HTTP endpoint from a workbench
---

The HTTP tool lets a workbench agent call a REST endpoint you define, including the URL, method, headers, body, and input schema. Configure the connection once, then attach it to the workbenches that should use it.

## Capabilities

* Placeholder: name each operation the agent can call, from `lib/console/ai/tools/workbench/` (and `go/cloud-query/internal/tools/` when the tool is query-backed).
* Placeholder: mention permissions only when the implementation or the setup guide states them.

## Setup

Create the tool under **Workbenches → Integrations** and follow the inline setup guide for credentials and Console fields. That guide is maintained at `js/console/public/setup-guides/tools/http.md`.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
