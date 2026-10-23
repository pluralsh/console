# Slack tool setup

Workbench’s Slack integration calls the **Slack Web API** (`https://slack.com/api`) with your app’s **bot user OAuth token** (`xoxb-…`). The backend sends that token as `Authorization: Bearer <token>`.

Use this guide to create a Slack app, install it to your workspace, and grant **bot token scopes** that match the built-in Workbench Slack tools (list/find channels, list messages, post and edit messages, react to messages, create channels, invite members, list user groups).

## 1) Create or choose a Slack app

1. Open [Slack API: Your Apps](https://api.slack.com/apps) and create an app (**From scratch**), or reuse an app you already own.
2. You only need a normal workspace app with a **bot token**; no extra platform features are required beyond OAuth and scopes.

## 2) Bot token and OAuth install

1. Open **OAuth & Permissions**.
2. Under **Scopes** → **Bot Token Scopes**, add the scopes in the next section (or the consolidated list at the end).
3. Install the app to your workspace (**Install to Workspace**).
4. Copy **Bot User OAuth Token** (starts with `xoxb-`). That is the value for the Workbench field **Bot user OAuth token**.

Invite the bot (for example with `/invite @your-app` in the channel) to every channel it should read, post in, or invite others to. With a bot token, Slack requires channel membership for `conversations.history`, `chat.postMessage`, and `conversations.invite`, in **public** channels as well as private ones. Private channels the bot has not joined are also omitted from channel listings.

If agents only need to post to public channels, you can add the `chat:write.public` bot scope instead of joining each one; reading history and inviting still require membership.

## 3) Scopes used by built-in Slack tools

These tools are implemented against the Slack Web API. Add the scopes for each tool you want agents to use; each row links to Slack’s method reference for details.

| Built-in tool (name suffix) | Slack API method | Bot token scopes |
|-----------------------------|------------------|------------------|
| `slack_list_channels_*`, `slack_find_channel_by_name_*` | [`conversations.list`](https://api.slack.com/methods/conversations.list) | `channels:read`, `groups:read` |
| `slack_list_messages_*` | [`conversations.history`](https://api.slack.com/methods/conversations.history) | `channels:history`, `groups:history` |
| `slack_post_message_*` | [`chat.postMessage`](https://api.slack.com/methods/chat.postMessage) | `chat:write` |
| `slack_edit_message_*` | [`chat.update`](https://api.slack.com/methods/chat.update) | `chat:write` |
| `slack_react_to_message_*` | [`reactions.add`](https://api.slack.com/methods/reactions.add) | `reactions:write` (add **`reactions:read`** if agents need to inspect existing reactions on a message) |
| `slack_create_channel_*` | [`conversations.create`](https://api.slack.com/methods/conversations.create) | `channels:manage` (public channels), `groups:write` (private channels) |
| `slack_invite_to_channel_*` | [`conversations.invite`](https://api.slack.com/methods/conversations.invite) | `channels:write.invites` (public channels), `groups:write.invites` (private channels). If you pass `usergroup_id`, [`usergroups.users.list`](https://api.slack.com/methods/usergroups.users.list) also runs—use `usergroups:read` (below). |
| `slack_list_user_groups_*` | [`usergroups.list`](https://api.slack.com/methods/usergroups.list) | `usergroups:read` |

### Recommended scope set (all built-in tools)

If you want every built-in Slack tool to work (public and private channels, including invites and user groups), add **all** of these **Bot Token Scopes**:

`chat:write`, `channels:read`, `groups:read`, `channels:history`, `groups:history`, `reactions:read`, `reactions:write`, `channels:manage`, `groups:write`, `channels:write.invites`, `groups:write.invites`, `usergroups:read`

You can omit scopes for features you do not need (for example, skip `usergroups:read` if you never use `slack_list_user_groups_*` or `usergroup_id` on invites).

## 4) Fill the Workbench tool form

- **Bot user OAuth token**: paste the `xoxb-` token from **OAuth & Permissions**.

After saving, associate this tool with a workbench so jobs can use the built-in Slack tools for that connection.

## Further reading

- [Slack API: Installing with OAuth](https://api.slack.com/authentication/oauth-v2)
- [Slack API: Scope reference](https://api.slack.com/scopes)
- [Slack API: authentication overview](https://docs.slack.dev/authentication/)
