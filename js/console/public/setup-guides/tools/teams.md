# Microsoft Teams tool setup

Workbench’s Microsoft Teams integration calls **Microsoft Graph** `v1.0` (`https://graph.microsoft.com/v1.0`) with an **application** token from a Microsoft Entra app registration. The backend uses the [OAuth 2.0 client credentials flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow): it requests a token from `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token` with scope `https://graph.microsoft.com/.default`, then sends that token as `Authorization: Bearer <token>`.

Use this guide to register the app, grant **application** permissions that match the built-in Workbench Teams tools (list and search teams, list channels and channel messages, search users and groups, post and edit channel messages, react to messages, reply to a chatbot mention), and paste the tenant id, client id, and client secret into Workbench.

Delegated permissions on the same app are not used. An administrator must **grant admin consent** for the application permissions you add.

## 1) Register an Entra application

1. In the [Microsoft Entra admin center](https://entra.microsoft.com), open **Identity → Applications → App registrations** and select **New registration**.
2. Name the app and register it in the directory that owns the teams agents should reach.
3. On the app’s **Overview** page, copy **Application (client) ID** and **Directory (tenant) ID**. Those are the Workbench fields **Application (client) ID** and **Tenant (directory) ID**.
4. Open **Certificates & secrets**, create a **client secret**, and copy the secret **Value** (not the secret ID). That is the Workbench field **Client secret**.

## 2) Application permissions used by built-in Teams tools

These tools are implemented against Microsoft Graph. Add an **application** permission for each tool you want agents to use; each row links to the Graph method reference.

| Built-in tool (name suffix) | Microsoft Graph method | Application permission |
|-----------------------------|------------------------|------------------------|
| `teams_list_teams_*`, `teams_search_teams_*`, `teams_search_groups_*` | [`GET /groups`](https://learn.microsoft.com/en-us/graph/api/group-list) | `Group.Read.All` |
| `teams_list_channels_*` | [`GET /teams/{team-id}/channels`](https://learn.microsoft.com/en-us/graph/api/channel-list) | `Channel.ReadBasic.All` |
| `teams_list_channel_messages_*` | [`GET /teams/{team-id}/channels/{channel-id}/messages`](https://learn.microsoft.com/en-us/graph/api/channel-list-messages) | `ChannelMessage.Read.All` |
| `teams_search_users_*` | [`GET /users`](https://learn.microsoft.com/en-us/graph/api/user-list) | `User.Read.All` |
| `teams_post_channel_message_*` | [`POST /teams/{team-id}/channels/{channel-id}/messages`](https://learn.microsoft.com/en-us/graph/api/channel-post-messages) | Application tokens are accepted only for migration (`Teamwork.Migrate.All`). Ordinary posts require the delegated permission `ChannelMessage.Send`, which this connection does not obtain. |
| `teams_update_channel_message_*` | [`PATCH /teams/{team-id}/channels/{channel-id}/messages/{message-id}`](https://learn.microsoft.com/en-us/graph/api/channel-message-update) | Same restriction as posting. |
| `teams_react_to_channel_message_*` | [`POST …/messages/{message-id}/setReaction`](https://learn.microsoft.com/en-us/graph/api/chatmessage-setreaction) | Not supported for application tokens. Delegated `ChannelMessage.Send` is required, and this connection does not obtain it. |
| `teams_reply_*` | Bot Framework connector [`POST {serviceUrl}/v3/conversations/{conversationId}/activities`](https://learn.microsoft.com/en-us/azure/bot-service/rest-api/bot-framework-rest-connector-api-reference) | No Graph permission. Uses a second client-credentials token scoped to `https://api.botframework.com/.default` with the same client id, secret, and tenant. Only succeeds on a job started by a Teams chatbot @mention. |

`teams_list_teams_*` and `teams_search_teams_*` return team-enabled Microsoft 365 groups (`resourceProvisioningOptions` contains `Team`). `teams_search_groups_*` searches every group the app can read, including groups that are not teams.

On the app registration, open **API permissions → Add a permission → Microsoft Graph → Application permissions**, add the rows you need, then select **Grant admin consent**.

### Recommended permission set (directory and channel reads)

For every read tool (list and search teams, list channels, list channel messages, search users, search groups), add **all** of these **application** permissions and grant admin consent:

`Group.Read.All`, `Channel.ReadBasic.All`, `ChannelMessage.Read.All`, `User.Read.All`

You can omit a permission for a tool you do not need (for example, skip `User.Read.All` if agents never call `teams_search_users_*`).

Listing channel messages in application context must run in the tenant that owns the channel. Directory searches send an OData `contains` filter and do not set the `ConsistencyLevel: eventual` header. Graph may reject that query as an advanced query.

### Posting, editing, reactions, and replies

Do not add `Teamwork.Migrate.All` to make ordinary channel posts work. Graph limits that application permission to migration, and `setReaction` does not support application tokens at all. `teams_post_channel_message_*`, `teams_update_channel_message_*`, and `teams_react_to_channel_message_*` call Graph with the application token from this form, so those calls fail for a normal app registration.

`teams_reply_*` is the path that answers a person who @mentioned the bot. It posts through the Bot Framework connector and reads the conversation URL and conversation id from the job. On any other job it returns `no teams chat context is available for this job`. The app registration has to be the bot that received the mention, so it can acquire the Bot Framework token for the stored tenant. Single-tenant bots use that tenant id; a multi-tenant bot needs the tenant id adjusted to the authority that can issue the connector token.

## 3) Fill the Workbench tool form

- **Tenant (directory) ID**: Directory (tenant) ID from the app’s **Overview** page. Plural puts this in the token URL.
- **Application (client) ID**: Application (client) ID from the same page.
- **Client secret**: the secret **Value** from **Certificates & secrets**.

After saving, associate this tool with a workbench so jobs can use the built-in Teams tools for that connection.

## Further reading

- [Microsoft identity platform: client credentials flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow)
- [Microsoft Graph permissions reference](https://learn.microsoft.com/en-us/graph/permissions-reference)
- [Bot Framework connector API](https://learn.microsoft.com/en-us/azure/bot-service/rest-api/bot-framework-rest-connector-api-reference)
