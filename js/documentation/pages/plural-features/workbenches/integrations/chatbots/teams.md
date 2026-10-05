---
title: Microsoft Teams
description: Start a workbench job from a Microsoft Teams @mention
---

The Microsoft Teams chatbot starts a workbench job when someone @mentions the bot in a channel. Teams delivers messages to Plural through a Bot Framework endpoint, and the bot replies in that channel.

## Capabilities

The Microsoft Teams chatbot connects via an **inbound Bot Framework webhook**. Unlike Slack, there is no long-lived outbound websocket; instead, Teams delivers messages to Plural through an HTTP endpoint configured in your Azure Bot. When someone @mentions the bot in a bound channel, Teams posts a Bot Framework activity to Plural, which spawns a workbench job and replies via the Bot Framework connector.

**How it works:**

- **Receiving mentions** — Teams sends `message` activities to Plural's webhook endpoint (`https://<console-domain>/ext/v1/webhooks/teams/<connection-id>`). Each activity includes an `entities` array. The bot checks whether any entity has `type: "mention"` and the `mentioned.id` matches the bot's application ID. If so, it creates a workbench job for the bound workbench. The mention text is cleaned (stripping `<at>` tags) and used as the prompt.
- **Replying** — The spawned job automatically receives a Teams reply tool (the same connection used for the chatbot, backfilled on job start). Reply coordinates—the Bot Framework `serviceUrl` and `conversationId` from the original activity—are stored with the job so the agent can reply without needing channel or message IDs. The agent calls `teams_reply` with just the response text, and Plural posts it to the same conversation via the Bot Framework connector. Replies are posted to the same conversation, preserving the original mention's Teams conversation context.
- **Threading** — Teams activities include both a stable channel ID, used to match workbench chatbot bindings, and a conversation ID that identifies the Teams conversation. Replies are posted to the same conversation, preserving the original mention's Teams conversation context.

**Authentication and permissions:**

The setup guide covers creating an Azure Bot, registering a Microsoft App, and wiring the messaging endpoint to Plural. You need three secrets from the app registration:

- **Application (client) ID** — Validates the JWT on every inbound activity and identifies the bot in Bot Framework connector requests.
- **Client secret** — Mints access tokens for the Bot Framework connector (to send replies) and Microsoft Graph (to list teams and channels for the binding UI).
- **Directory (tenant) ID** — The Azure AD tenant where the bot is registered.

The app registration also needs Microsoft Graph application permissions such as `Group.Read.All` (for discovering teams via the `/groups` endpoint), `Team.ReadBasic.All`, and `Channel.ReadBasic.All` (with admin consent granted) so Console can list teams and channels when you bind a workbench to a channel.

**Platform limitations:**

Microsoft Teams does not support bots setting emoji reactions on messages. The Teams chatbot acknowledges and responds with text messages rather than reactions.

## Setup

Create the chatbot connection in Console and follow the inline setup guide for app credentials and channel binding. That guide is maintained at `js/console/public/setup-guides/chatbots/teams.md`.

## Related

- [Chatbots](/plural-features/workbenches/integrations/chatbots)
