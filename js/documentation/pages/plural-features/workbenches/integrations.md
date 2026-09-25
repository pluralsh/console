---
title: Integrations
description: How workbench tools, webhooks, and chatbots differ
---

Integrations connect a workbench to systems outside Plural. They are configured under **Workbenches → Integrations** and fall into three groups, depending on who starts the interaction.

## Tools

[Tools](/plural-features/workbenches/integrations/tools) are connections the agent calls while a job is running. Configure a tool once, then attach it to the workbenches that should be allowed to use it. Datadog, GitHub, Slack, and cloud connections are tools.

Capabilities that ship with the workbench runtime, such as Kubernetes, stacks, and pod logs, are not tools. Enable those on the workbench itself. See [Plural native integrations](/plural-features/workbenches/integrations/tools#plural-native-integrations).

## Webhooks

[Webhooks](/plural-features/workbenches/integrations/webhooks) are inbound event sources. Observability alerts and issue-tracker events are delivered to Plural, and a workbench can start a job when a payload matches. This section covers registering those sources. Binding a source to a workbench prompt is covered in [Automating workbench jobs](/plural-features/workbenches/automation#webhook-triggers).

## Chatbots

[Chatbots](/plural-features/workbenches/integrations/chatbots) start a job from a conversation. People @mention the workbench bot in Slack or Microsoft Teams, and the bot replies in that channel.
