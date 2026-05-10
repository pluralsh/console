# Slack tool setup

Workbench connects to Slack’s **hosted MCP server** at `https://mcp.slack.com/mcp`. The backend sends your token as `Authorization: Bearer <token>`.

Use this guide to obtain a credential and scopes that support **finding channels**, **searching Slack**, **reading conversations**, and **posting messages**.

## 1) Create or choose a Slack app

1. Open [Slack API: Your Apps](https://api.slack.com/apps) and create an app (**From scratch**), or reuse an integration app you already own.
2. Slack only allows MCP for **workspace-installed internal apps** or **Marketplace-published** apps—not arbitrary unlisted apps. Confirm your app qualifies for MCP per [Slack MCP overview](https://docs.slack.dev/ai/mcp-server/).
3. Under **Agents & AI Apps** (or equivalent in your app settings), **enable Model Context Protocol (MCP)** for the app so hosted MCP accepts traffic for it.

Official walkthrough with a manifest example: [Developing a sample app with the Slack MCP Server](https://docs.slack.dev/ai/slack-mcp-server/developing).

## 2) Bot token and OAuth install

1. Open **OAuth & Permissions**.
2. Add **Bot Token Scopes** (see below). For search-oriented tools, Slack’s docs map capabilities to **user** scopes; if you need those, configure **User Token Scopes** and complete a user OAuth install as described in Slack’s MCP documentation.
3. Install the app to your workspace (**Install to Workspace**).
4. Copy **Bot User OAuth Token** (starts with `xoxb-`). That is the value for the Workbench field **Bot user OAuth token**.

## 3) Scopes to support common agent tasks

Slack’s MCP tools are permission-gated. Add the scopes you actually need; the table below follows [Slack’s MCP scope reference](https://docs.slack.dev/ai/slack-mcp-server/developing#add-scopes).

| Goal | Scopes to add (per Slack docs) |
|------|----------------------------------|
| **Search** messages / channels / DMs / group DMs | `search:read.public`, `search:read.private`, `search:read.mpim`, `search:read.im` |
| **Search** files | `search:read.files` |
| **Search** users | `search:read.users` |
| **Post** messages | `chat:write` |
| **Read** channel / thread history | `channels:history`, `groups:history`, `im:history`, `mpim:history` |
| **User profiles** (optional) | `users:read`, `users:read.email` |
| **Canvases** (optional) | `canvases:read`, `canvases:write` |

The sample manifest in Slack’s docs also includes bot scopes such as `assistant:write` when using assistant-style features. Start with **search + `chat:write` + history** scopes that match how your agents use Slack, then tighten.

## 4) Fill the Workbench tool form

- **Bot user OAuth token**: paste the `xoxb-` token from **OAuth & Permissions**.

After saving, associate this tool with a workbench so jobs can call the Slack MCP tools exposed for your token.

## Further reading

- [Slack MCP server overview](https://docs.slack.dev/ai/mcp-server/)
- [Slack API: authentication](https://docs.slack.dev/authentication/)
