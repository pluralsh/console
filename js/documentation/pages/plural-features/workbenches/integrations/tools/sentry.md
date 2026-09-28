---
title: Sentry
description: Read Sentry issues and events from a workbench
---

The Sentry tool lets a workbench agent call the Sentry API while a job is running. This is separate from a Sentry webhook, which delivers events into Plural so a job can start.

## Capabilities

* Placeholder: name each operation the agent can call, from `lib/console/ai/tools/workbench/` (and `go/cloud-query/internal/tools/` when the tool is query-backed).
* Placeholder: mention permissions only when the implementation or the setup guide states them.

## Setup

Create the tool under **Workbenches → Integrations** and follow the inline setup guide for credentials and Console fields. That guide is maintained at `js/console/public/setup-guides/tools/sentry.md`.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
