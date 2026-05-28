# Slack chatbot setup

Workbench chatbots connect to Slack through a Slack app running in **Socket Mode**. Plural needs **two different tokens** from that app. They are not interchangeable.

| Plural field | Slack token | Prefix | Used for |
|--------------|-------------|--------|----------|
| **App-level token** | App-level token | `xapp-` | Opens the Socket Mode WebSocket via [`apps.connections.open`](https://api.slack.com/methods/apps.connections.open). Requires the **`connections:write`** app-level scope. |
| **Bot user OAuth token** | Bot User OAuth Token | `xoxb-` | Slack Web API calls (for example [`auth.test`](https://api.slack.com/methods/auth.test), posting messages, reading events). Requires **bot token scopes** from install. |

If Socket Mode fails to connect but the bot token seems fine, the problem is almost always the **app-level** token (wrong value, missing `connections:write`, or Socket Mode disabled on the app). Pasting an `xoxb-` token into the app-level field will not work.

Slack app manifests can enable Socket Mode and bot scopes, but they **do not** create app-level tokens. You must generate the `xapp-` token manually after the app exists.

## 1) Create the Slack app

1. Open [Slack API: Your Apps](https://api.slack.com/apps) and select **Create New App**.
2. Choose **From an app manifest**.
3. Pick the Slack workspace where the chatbot should run.
4. Paste the manifest below, review the app configuration, and create the app.

## 2) Slack app manifest

The manifest below enables **Socket Mode** (`socket_mode_enabled: true`) and the bot event subscriptions Workbench chatbots need. After creation, confirm under **Socket Mode** in the app settings that Socket Mode is **on**.

```yaml
display_information:
  name: Plural
  description: Integrate Plural with Slack
features:
  bot_user:
    display_name: Plural
    always_online: true
oauth_config:
  scopes:
    bot:
      - app_mentions:read
      - channels:history
      - channels:read
      - chat:write
      - groups:history
      - groups:read
      - im:history
      - im:read
      - mpim:history
      - mpim:read
settings:
  event_subscriptions:
    bot_events:
      - app_mention
      - message.channels
      - message.groups
      - message.im
      - message.mpim
  org_deploy_enabled: false
  socket_mode_enabled: true
  token_rotation_enabled: false
```

## 3) Install the app and copy the bot token

1. Open **OAuth & Permissions** in the Slack app settings.
2. Confirm the **Bot Token Scopes** from the manifest are present.
3. Select **Install to Workspace** or **Reinstall to Workspace**.
4. Copy the **Bot User OAuth Token**. It starts with `xoxb-`.
5. Paste it into Plural's **Bot user OAuth token** field when creating the chatbot connection.

This token is **not** used for `apps.connections.open`. It authorizes the bot user for Web API calls after the Socket Mode connection is open.

## 4) Create the app-level token

1. Open **Basic Information** for the same Slack app.
2. Scroll to **App-Level Tokens** and select **Generate Token and Scopes**.
3. Name the token (any label is fine).
4. Add exactly this **app-level** scope: **`connections:write`**.
5. Generate the token and copy it immediately. It starts with `xapp-`.
6. Paste it into Plural's **App-level token** field.

This is the only token Plural sends to `apps.connections.open` to obtain the Socket Mode WebSocket URL. Without `connections:write`, that call returns an authentication or scope error.

## 5) Save the connection in Plural

1. In the Workbench **Add new chatbot** form, choose **Slack** as the chat platform.
2. Enter a display **Name**.
3. Paste the **`xapp-`** value in **App-level token**.
4. Paste the **`xoxb-`** value in **Bot user OAuth token**.
5. Save the connection.

Plural stores both tokens encrypted. They are not shown again in the UI after save; keep a copy in your secrets manager if you need to rotate them later.

After save, the chat connection may take a few minutes to start on the cluster node that owns it.

## 6) Attach a Workbench channel

When creating the Workbench chatbot binding, use the Slack channel ID, not the display name:

- Public channels usually start with `C`.
- Private channels usually start with `G`.
- Direct messages usually start with `D`.

For private channels, invite the bot to the channel before expecting it to receive or send messages there.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `apps.connections.open` / Socket Mode auth error | App-level token wrong or missing scope | Regenerate an `xapp-` token with **`connections:write`**. Do not use the `xoxb-` bot token here. |
| Bot token works in Slack API tester but chatbot never connects | Socket Mode off | In the Slack app, open **Socket Mode** and turn it **on** (the manifest should do this; verify after edits). |
| Connection saved but bot idle for several minutes | Startup polling | Wait a few minutes after save, or check server logs for the chat connection id. |
| Bot never sees private channel messages | Bot not in channel | `/invite @YourBot` in that private channel. |

## Further reading

- [Slack Socket Mode](https://api.slack.com/apis/connections/socket)
- [`apps.connections.open` method](https://api.slack.com/methods/apps.connections.open)
- [`connections:write` scope](https://api.slack.com/scopes/connections:write)
- [Slack app-level tokens](https://api.slack.com/authentication/tokens#app-level)
- [Slack OAuth scopes](https://api.slack.com/scopes)
- [Slack app manifests](https://api.slack.com/reference/manifests)
