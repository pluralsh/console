---
title: Slack
description: Start a workbench job from a Slack @mention
---

The Slack chatbot starts a workbench job when someone @mentions the bot in a channel. It connects through a Slack app in Socket Mode and replies in that channel. This is separate from the [Slack tool](/plural-features/workbenches/integrations/tools/slack), which the agent calls during a job.

## Capabilities

The Slack chatbot connects via **Socket Mode**, an outbound websocket from Plural to Slack that streams channel messages and @mentions in real time. When someone @mentions the bot in a bound channel, Plural spawns a workbench job with the mention text as the prompt. The agent runs its investigation or task and replies in the same channel using Slack's chat API.

**How it works:**

- **Receiving mentions** — Slack delivers `app_mention` and `message.*` events to Plural over the Socket Mode websocket. The bot checks whether the message text contains its user ID (`<@USER_ID>`). If so, it creates a workbench job for the bound workbench with the message text as the prompt. If the mention is inside a thread and the parent message was also a bot mention, Plural queues the new mention as a follow-up prompt on the existing job rather than starting a new one.
- **Replying** — The spawned job automatically receives a Slack tool (the same connection used for the chatbot, backfilled on job start) so the agent can reply. The agent calls `slack_post_message` with the channel ID and, if replying in a thread, the original message's `thread_ts`. Agents can also call `slack_react_to_message` to add emoji reactions while the job is running.
- **Threading** — When a user @mentions the bot in a thread, Plural recognizes the parent message and either continues the same job (if the parent was a bot-triggered job) or starts a new job. Replies posted by the agent can use `thread_ts` to keep conversations grouped.

**Authentication and scope requirements:**

The setup guide details the two tokens needed for Socket Mode. Both are required; pasting the bot token into the app-level token field will not work.

- **App-level token** (`xapp-`) — Opens the Socket Mode websocket via `apps.connections.open`. Requires the `connections:write` scope.
- **Bot user OAuth token** (`xoxb-`) — Used for all Slack Web API calls after the websocket is open: reading channel history, posting messages, adding reactions, and resolving channel names. Requires bot token scopes including `chat:write`, `channels:history`, `groups:history`, `reactions:read`, and `reactions:write`.

The setup guide lists the full manifest and scope requirements for public channels, private channels, and direct messages.

## Setup

Create the chatbot connection in Console and follow the inline setup guide for app credentials and channel binding. That guide is maintained at `js/console/public/setup-guides/chatbots/slack.md`.

## Related

- [Chatbots](/plural-features/workbenches/integrations/chatbots)
