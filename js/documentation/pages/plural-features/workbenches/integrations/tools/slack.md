---
title: Slack
description: Post and read Slack messages from a workbench job
---

Use the Slack tool to let a workbench agent work in your Slack workspace during a job. The agent can find channels, read channel history, post and edit messages, reply in threads, add reactions, create channels, and invite people or user groups. Plural calls the [Slack Web API](https://docs.slack.dev/apis/web-api/) with the bot token of a Slack app you install in your workspace.

The Slack tool is separate from the [Slack chatbot](/plural-features/workbenches/integrations/chatbots/slack), which starts a job when someone @mentions the bot. Configure this tool when the agent should talk to Slack on its own, for example to post a summary at the end of a scheduled job.

This guide uses the Plural Console UI. For the complete list of integrations and general tool behavior, see [Workbench tools](/plural-features/workbenches/integrations/tools).

## Prerequisites

Before you begin, make sure you have:

* A Slack workspace where you can create and install an app, or a workspace admin who can approve the installation.
* Permission in Plural Console to create a configured tool and edit the target workbench.
* An existing workbench, or permission to create one. See [Setting up a workbench](/plural-features/workbenches/configuration).

### Create a Slack app and bot token

1. Open [Your Apps](https://api.slack.com/apps) in Slack and click **Create New App → From scratch**, or reuse an app you already own. The tool only needs a bot token; no other app features are required.
2. Open **OAuth & Permissions**. Under **Scopes → Bot Token Scopes**, add the scopes from [Slack scopes](#slack-scopes) for the operations you want the agent to use.
3. Click **Install to Workspace** and approve the installation.
4. Copy the **Bot User OAuth Token**. It starts with `xoxb-`.

If you add scopes later, reinstall the app so the token receives them. If the **Bot User OAuth Token** value changes, update the configured tool with the new value.

### Add the bot to channels

With a bot token, Slack only lets the app read history, post, and invite in channels where the bot is a member. This applies to public channels as well as private ones. Add the app to each channel the agent should work in, for example by running `/invite @<your app name>` in the channel.

Private channels the bot has not joined do not appear in channel listings. Channels the agent creates itself already include the bot.

{% callout severity="info" %}
If the agent only needs to post to public channels, you can add the `chat:write.public` scope instead of joining each one. Slack then allows `chat.postMessage` in any public channel. Reading history and inviting still require the bot to be a member.
{% /callout %}

### Slack scopes

Each operation calls one Slack Web API method. Add the bot token scopes for the operations you plan to use:

| Operation | Slack API method | Bot token scopes |
|---|---|---|
| `slack_list_channels`, `slack_find_channel_by_name` | [`conversations.list`](https://docs.slack.dev/reference/methods/conversations.list) | `channels:read`, `groups:read` |
| `slack_list_messages` | [`conversations.history`](https://docs.slack.dev/reference/methods/conversations.history) | `channels:history`, `groups:history` |
| `slack_post_message` | [`chat.postMessage`](https://docs.slack.dev/reference/methods/chat.postMessage) | `chat:write` |
| `slack_edit_message` | [`chat.update`](https://docs.slack.dev/reference/methods/chat.update) | `chat:write` |
| `slack_react_to_message` | [`reactions.add`](https://docs.slack.dev/reference/methods/reactions.add) | `reactions:write` |
| `slack_create_channel` | [`conversations.create`](https://docs.slack.dev/reference/methods/conversations.create) | `channels:manage` for public channels, `groups:write` for private channels |
| `slack_invite_to_channel` | [`conversations.invite`](https://docs.slack.dev/reference/methods/conversations.invite) | `channels:write.invites` for public channels, `groups:write.invites` for private channels |
| `slack_list_user_groups` | [`usergroups.list`](https://docs.slack.dev/reference/methods/usergroups.list) | `usergroups:read` |

When `slack_invite_to_channel` receives a user group, it first calls [`usergroups.users.list`](https://docs.slack.dev/reference/methods/usergroups.users.list), which also needs `usergroups:read`.

The channel listing always requests both public and private channels, so grant `channels:read` and `groups:read` together. To enable every operation for public and private channels, add all of these scopes:

```text
chat:write
channels:read
groups:read
channels:history
groups:history
reactions:write
channels:manage
groups:write
channels:write.invites
groups:write.invites
usergroups:read
```

Leave out scopes for operations you do not want the agent to perform. A call that needs a missing scope fails with Slack's `missing_scope` error. For more about scopes, see Slack's [scope reference](https://docs.slack.dev/reference/scopes).

## Capabilities

The tool registers nine operations. In a job, each name ends with the configured tool's name, so a tool named `slack_ops` exposes `slack_post_message_slack_ops`.

| Operation | What it does |
|---|---|
| `slack_list_channels` | Lists public and private channels the bot can see, excluding archived channels. Accepts a page size of 1 to 1,000 and a cursor for the next page. |
| `slack_find_channel_by_name` | Resolves a channel name, such as `general` or `#general`, to its channel record. The match is case-insensitive on the channel name. It pages through the channel list 200 at a time and stops after 50 pages. |
| `slack_list_messages` | Reads recent messages from a channel by channel ID. Accepts a page size of 1 to 1,000 and a cursor. Each message includes the `ts` timestamp that the edit and reaction operations use. |
| `slack_post_message` | Posts text to a channel by channel ID. With an optional `thread_ts`, the message is posted as a reply in that thread. |
| `slack_edit_message` | Replaces the text of an existing message, identified by channel ID and message `ts`. |
| `slack_react_to_message` | Adds an emoji reaction to a message. The emoji is given by name, with or without surrounding colons. |
| `slack_create_channel` | Creates a public channel, or a private channel when requested. |
| `slack_invite_to_channel` | Invites users to a channel by user ID, by user group ID, or both. Group members are merged with the listed users. |
| `slack_list_user_groups` | Lists the workspace's user groups, optionally including disabled groups, with each group's ID and handle. |

Operations return Slack's JSON response to the agent. A response in which Slack reports `ok: false` is returned as a failed call that includes Slack's error.

The agent works with channel IDs, not display names. It usually finds a channel with `slack_find_channel_by_name` or `slack_list_channels` first and then passes the ID to the other operations.

## Create the Slack tool

1. In Plural Console, open **Workbenches → Integrations**.
2. Find the **Slack** card and click **Add tool**.

### Configure the connection

On the **Configuration** step, enter:

* **Name** — a recognizable name for the connection, such as `slack_ops`. It must start with a lowercase letter, end with a letter or number, and contain only lowercase letters, numbers, dots, and underscores. It becomes part of each operation name the agent sees.
* **Bot user OAuth token** — the `xoxb-` token from **OAuth & Permissions**.

Click **Next**.

{% callout severity="warning" %}
Treat the bot token as a secret. Plural stores it encrypted and does not display it after saving. Never include it in screenshots, workbench prompts, or job output.
{% /callout %}

### Configure access

On the **Access policy** step, add the users or groups that should have read or write access to this configured tool:

* **Read permissions** control who can access and attach the tool to a workbench.
* **Write permissions** control who can modify the tool configuration and access policy.

Click **Save**. After the creation confirmation appears, the connection is available under **Workbenches → Configured Tools**.

## Attach Slack to a workbench

You can attach the tool while creating a workbench or add it to an existing one.

### New workbench

On the final **Attach tools** step of the workbench wizard:

1. Click **Add tools**.
2. Select the Slack connection by its configured name.
3. Complete the wizard by clicking **Create workbench**.

### Existing workbench

1. Open the workbench.
2. In the left sidebar, find **Tools** and click **Add tools**. You can also open the overflow menu and select **Tools**.
3. In **Add or remove tool from workbench**, select the Slack connection.
4. Click **Save**.

The configured Slack tool now appears in the workbench's **Tools** section.

## Use Slack from a workbench

Open the workbench's **Launch** tab and describe the task in the prompt box. The **Jobs** tab contains run history rather than the new-job prompt. Name the channel, say what to read or post, and say whether a reply belongs in a thread.

Try prompts such as:

* **Post a summary:** `When the investigation is done, post a three-line summary of the root cause and next steps to the #platform-alerts channel in Slack.`
* **Read context:** `Read the last 50 messages in #incident-checkout and summarize what has already been tried.`
* **Reply in a thread:** `Find the most recent message in #deploys that mentions payments-api and reply in its thread with the current rollout status.`
* **Open a channel:** `Create a channel named inc-checkout-latency, invite the @sre-oncall user group, and post the incident summary there.`

Submit the job and watch its activity stream. To verify the integration, open the Slack tool activity and check that the call succeeded, then confirm the message in Slack. A tool activity entry can also contain a Slack error, so its presence alone does not verify the connection. For more about job output, see [Running workbench jobs](/plural-features/workbenches/running-jobs).

## Behavior and limits

* **Messages are plain text.** `slack_post_message` and `slack_edit_message` send only the message text, which Slack renders with its standard [text formatting](https://docs.slack.dev/messaging/formatting-message-text). Blocks, attachments, and files are not supported. Slack rejects edited text longer than 4,000 characters.
* **Thread replies stay in the thread.** When the agent passes `thread_ts`, the reply is posted in the thread only and is not broadcast to the channel. Without `thread_ts`, the message is posted to the channel.
* **Edits are limited to the bot's own messages.** Slack only lets a bot update messages it posted. Editing anyone else's message fails with `cant_update_message`.
* **Mentioning user groups.** Use the ID and handle from `slack_list_user_groups` to mention a group in message text as `<!subteam^ID|handle>`.
* **Channel names.** `slack_create_channel` lowercases the name and removes a leading `#`. The result must be 80 characters or fewer and contain only lowercase letters, numbers, hyphens, and underscores.
* **Invites.** `slack_invite_to_channel` sends at most 100 user IDs per call, after merging user group members with listed users. Larger sets are rejected rather than split into batches. By default, Slack rejects the whole invite if any user is invalid; the agent can set `force` to invite the valid users and skip the rest.
* **Pagination.** List operations return one page of results with a `next_cursor` the agent can pass to fetch the next page. Channel name lookup searches at most 50 pages of 200 channels.
* **History scope.** `slack_list_messages` reads a channel's messages, not replies inside threads.

## Troubleshooting

### Authentication or scope errors

* `invalid_auth` or `not_authed` means the token is wrong or was revoked. Copy the current **Bot User OAuth Token** from **OAuth & Permissions** and update the configured tool.
* `missing_scope` means the bot token lacks a scope the operation needs. Compare the app's **Bot Token Scopes** with [Slack scopes](#slack-scopes), reinstall the app, and update the token if Slack issued a new one.
* To rotate the token, open **Workbenches → Configured Tools**, select **Edit configuration**, and enter the replacement value. The existing token is never displayed.

### Channel errors

* `not_in_channel` means the bot is not a member of the channel. Add the app to the channel and retry. For posting to public channels only, you can add `chat:write.public` instead.
* `channel_not_found` usually means the agent passed a channel name instead of an ID, or the channel is private and the bot has not joined it. Ask the agent to resolve the channel with `slack_find_channel_by_name` first.
* If `slack_find_channel_by_name` reports no match, check the spelling, confirm the channel is not archived, and for a private channel confirm the bot is a member.

### Invites or channel creation fail

* For `slack_create_channel`, `name_taken` means a channel with that name already exists, and `restricted_action` means a workspace setting prevents the app from creating channels. Also confirm the bot has `channels:manage` for a public channel or `groups:write` for a private one.
* For `slack_invite_to_channel`, confirm the bot is a member of the target channel and has the invite scope for that channel type. Errors such as `already_in_channel`, `cant_invite`, or `user_not_found` come from Slack and name the failing user.

### The Slack tool is unavailable

* Confirm that the tool appears under **Workbenches → Configured Tools**.
* Verify that your user or group has read access to the configured tool.
* Reopen the workbench's **Tools** dialog and confirm that the Slack connection is selected.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
* [Slack chatbot](/plural-features/workbenches/integrations/chatbots/slack) — start a workbench job from a Slack @mention
