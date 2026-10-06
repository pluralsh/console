---
title: Slack
description: Post and read Slack messages from a workbench job
---

The Slack tool is what a workbench agent calls during a job to post messages, read channel history, and manage channels. It is separate from the [Slack chatbot](/plural-features/workbenches/integrations/chatbots/slack), which starts a job when someone @mentions the bot.

## Prerequisites

Before you begin, make sure you have:

* Permission in Plural Console to create a configured tool and edit the target workbench.
* A Slack app with a bot user, installed to your workspace, with the bot token scopes for the capabilities you want to enable (see below).
* The bot invited into any **private** channel it should list, read, post in, or invite members to — a bot only sees private channels it has joined.

### Create a Slack app and bot token

1. Open [Slack API: Your Apps](https://api.slack.com/apps) and create an app **From scratch**, or reuse an app you already own.
2. Open **OAuth & Permissions** and, under **Bot Token Scopes**, add the scopes for the operations you want available (see the table below).
3. Click **Install to Workspace**, then copy the **Bot User OAuth Token** (it starts with `xoxb-`).

## Capabilities

Every operation below runs with the bot token's permissions, so a scope that is missing from the token causes that operation to fail even though it is registered.

| Operation | What it does | Required bot token scopes |
|---|---|---|
| `slack_list_channels` | List Slack channels (public and private) via `conversations.list`. Omits archived channels and private channels the bot has not joined. | `channels:read`, `groups:read` |
| `slack_find_channel_by_name` | Resolve a channel ID by its name (case-insensitive, without `#`) via `conversations.list`. | `channels:read`, `groups:read` |
| `slack_list_messages` | List recent messages in a channel via `conversations.history`. Each message's `ts` can be passed to `slack_edit_message` or `slack_react_to_message`. | `channels:history`, `groups:history` |
| `slack_post_message` | Post a message to a channel via `chat.postMessage`. Pass an optional `thread_ts` to reply in a thread. | `chat:write` |
| `slack_edit_message` | Edit an existing message via `chat.update`. | `chat:write` |
| `slack_react_to_message` | Add an emoji reaction to a message via `reactions.add`. | `reactions:write` (add `reactions:read` if agents should also inspect existing reactions) |
| `slack_create_channel` | Create a public or private channel via `conversations.create`. The channel name must use lowercase letters, numbers, hyphens, and underscores, up to 80 characters. | `channels:manage` (public), `groups:write` (private) |
| `slack_invite_to_channel` | Invite up to 100 users to a channel via `conversations.invite`. Accepts user IDs and/or a user group ID, which is expanded via `usergroups.users.list`. | `channels:write.invites` (public), `groups:write.invites` (private); add `usergroups:read` when passing a user group ID |
| `slack_list_user_groups` | List Slack user groups (subteams) via `usergroups.list`, including each group's ID and handle for `<!subteam^ID|handle>` mentions. | `usergroups:read` |

To enable every operation, add all of the scopes above to the app's Bot Token Scopes.

## Create the Slack tool

1. In Plural Console, open **Workbenches → Integrations**.
2. Find the **Slack** card and click **Add tool**.
3. On the **Configuration** step, paste the `xoxb-` token into **Bot user OAuth token**.
4. Click **Next**.

### Configure access

On the **Access policy** step, add the users or groups that should have read or write access to this configured tool:

* **Read permissions** control who can access and attach the tool to a workbench.
* **Write permissions** control who can modify the tool configuration and access policy.

Click **Save**. The connection is now available under **Workbenches → Configured Tools**.

## Attach Slack to a workbench

You can attach the tool while creating a workbench or add it to an existing one. See [Workbench tools](/plural-features/workbenches/integrations/tools#attaching-tools-to-a-workbench) for the attachment steps, which are the same for every tool type.

## Using it from a workbench

Open the workbench's **Launch** tab and describe what you want the agent to do in Slack. Try prompts such as:

* `Find the #incidents channel and summarize the last 20 messages.`
* `Post a message in #deploys announcing that the checkout service rollout finished, and react to it with a checkmark.`
* `Create a private channel called incident-2026-10-06 and invite the on-call user group to it.`

## Troubleshooting

### Authentication or permission errors

* A `not_authed` or `invalid_auth` error means the bot token is missing or invalid — confirm **Bot user OAuth token** is set and starts with `xoxb-`.
* A `missing_scope` error means the bot token lacks a scope the called operation needs — add the scope from the table above and reinstall the app to your workspace.
* `channel_not_found` on a private channel usually means the bot has not been invited to it.

### No data is returned

* Confirm the channel is not archived, and that the bot has joined it if it is private.
* For `slack_list_messages`, confirm the channel actually has recent messages in the queried range.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
