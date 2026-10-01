---
title: VictoriaLogs
description: Query logs from a VictoriaLogs endpoint
---

The VictoriaLogs tool lets a workbench agent query a VictoriaLogs endpoint with LogsQL. Configure the connection once, then attach it to the workbenches that should use it.

## Capabilities

* $DOCSTUB: name each operation the agent can call, from `lib/console/ai/tools/workbench/` (and `go/cloud-query/internal/tools/` when the tool is query-backed).
* $DOCSTUB: mention permissions only when the implementation or the setup guide states them.

## Setup

Create the tool under **Workbenches → Integrations** and follow the inline setup guide for credentials and Console fields. That guide is maintained at `js/console/public/setup-guides/tools/victoria_logs.md`.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
