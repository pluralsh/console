---
title: Slack
description: Post and read Slack messages from a workbench job
---

The Slack tool is what a workbench agent calls during a job to post messages, read channel history, and manage channels. It is separate from the [Slack chatbot](/plural-features/workbenches/integrations/chatbots/slack), which starts a job when someone @mentions the bot.

## Capabilities

* Placeholder: name each operation the agent can call, from `lib/console/ai/tools/workbench/` (and `go/cloud-query/internal/tools/` when the tool is query-backed).
* Placeholder: mention permissions only when the implementation or the setup guide states them.

## Setup

Create the tool under **Workbenches → Integrations** and follow the inline setup guide for credentials and Console fields. That guide is maintained at `js/console/public/setup-guides/tools/slack.md`.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
