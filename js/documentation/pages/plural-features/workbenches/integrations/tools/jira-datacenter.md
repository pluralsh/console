---
title: Jira Data Center
description: Read and update Jira Data Center issues from a workbench
---

The Jira Data Center tool lets a workbench agent work with issues on a self-hosted Jira Data Center instance. Configure it with a dedicated account, then attach it to the workbenches that should use it.

## Capabilities

* $DOCSTUB: name each operation the agent can call, from `lib/console/ai/tools/workbench/` (and `go/cloud-query/internal/tools/` when the tool is query-backed).
* $DOCSTUB: mention permissions only when the implementation or the setup guide states them.

## Setup

Create the tool under **Workbenches → Integrations** and follow the inline setup guide for credentials and Console fields. That guide is maintained at `js/console/public/setup-guides/tools/jira_datacenter.md`.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
