---
title: Microsoft Teams
description: Connect Microsoft Teams to a workbench and interact with teams, channels, and messages
---

Use the Microsoft Teams integration to give a workbench access to your Microsoft 365 tenant's teams, channels, and messages through Microsoft Graph. After you configure the connection once, you can attach it to one or more workbenches and interact with Teams data using natural-language prompts.

This integration is distinct from the [Microsoft Teams chatbot](/plural-features/workbenches/integrations/chatbots/teams), which starts workbench jobs from @mentions. This tool lets an already-running workbench job query and post to Teams.

This guide uses the Plural Console UI. For the complete list of integrations and general tool behavior, see [Workbench tools](/plural-features/workbenches/integrations/tools).

## Prerequisites

Before you begin, make sure you have:

* A Microsoft 365 tenant with Microsoft Teams enabled and teams you want the workbench to access.
* Permission in Plural Console to create a configured tool and edit the target workbench.
* Access to the [Microsoft Entra admin center](https://entra.microsoft.com) with permissions to register applications and grant admin consent.
* An existing workbench, or permission to create one. See [Setting up a workbench](/plural-features/workbenches/configuration).

{% callout severity="warning" %}
The Teams tool uses **application permissions** with the OAuth 2.0 client credentials flow. An administrator must grant admin consent for each permission before the tool can call the corresponding Graph API.
{% /callout %}

### Create a Microsoft Entra app registration

In the [Microsoft Entra admin center](https://entra.microsoft.com):

1. Open **Identity → Applications → App registrations** and select **New registration**.
2. Name the app (for example, `Plural Workbench Teams Tool`) and register it in the directory that owns the teams the workbench should access.
3. On the app's **Overview** page, copy **Application (client) ID** and **Directory (tenant) ID**. You will enter these in the Plural Console configuration form.
4. Open **Certificates & secrets**, create a **client secret**, and copy the secret **Value** immediately. This is the **Client secret** field in Plural Console. Entra displays the secret value only once.

### Microsoft Graph application permissions

The Teams tool calls Microsoft Graph v1.0 (`https://graph.microsoft.com/v1.0`) with an application token, not a delegated token. Add the **application permissions** below to your app registration based on which capabilities you need. After adding permissions, an administrator must **grant admin consent** for each one.

To add permissions, open **API permissions → Add a permission → Microsoft Graph → Application permissions**, select the permissions for your use case, then click **Grant admin consent**.

#### Recommended read-only permissions

For read-only workbench access (list and search teams, channels, messages, users, and groups):

| Application permission | What the workbench can query |
|---|---|
| `Group.Read.All` | List and search Microsoft 365 groups, including team-enabled groups |
| `Channel.ReadBasic.All` | List channels in a team |
| `ChannelMessage.Read.All` | List messages in a channel |
| `User.Read.All` | Search users by display name, email, or user principal name |

Grant all four permissions for full read access. Omit any permission for capabilities you do not need (for example, skip `User.Read.All` if agents never call `teams_search_users`).

#### Posting, editing, and reaction limitations

Microsoft Graph restricts posting, editing, and reactions when using application tokens:

* **`teams_post_channel_message`** and **`teams_update_channel_message`** call Graph with the application token. Microsoft accepts application tokens for these APIs only when the app has `Teamwork.Migrate.All`, and that permission is limited to migration scenarios. Ordinary channel posting typically requires a **delegated** token with `ChannelMessage.Send`, which this tool does not obtain.
* **`teams_react_to_channel_message`** is not supported with application tokens at all. It requires the delegated permission `ChannelMessage.Send`.

Do not add `Teamwork.Migrate.All` to make normal posting work. Graph restricts that permission to migration tooling, and agents calling these operations with a standard application-only app registration will receive permission errors from Microsoft Graph.

#### Reply operation (Bot Framework only)

**`teams_reply`** does not use Microsoft Graph. It posts via the Bot Framework connector and only succeeds on jobs started by a Microsoft Teams chatbot @mention. The app registration must be the bot that received the mention so it can acquire a Bot Framework token scoped to `https://api.botframework.com/.default`. This operation reads the conversation URL and conversation ID from the job context and does not require Graph permissions. See the [Microsoft Teams chatbot](/plural-features/workbenches/integrations/chatbots/teams) for setup details.

## Capabilities

The Microsoft Teams tool provides read access to teams, channels, messages, users, and groups. Write operations (posting, editing, reactions) have permission restrictions and are documented with their limitations.

The workbench agent can call these operations:

* **teams_list_teams** — Lists Microsoft Teams (team-enabled Microsoft 365 groups) in the tenant. Returns team ID, display name, description, and visibility. Use the returned `id` as `team_id` when calling other operations. Supports pagination with `@odata.nextLink`.
* **teams_search_teams** — Searches Microsoft Teams by display name substring (case-insensitive). Returns team-enabled groups only. Supports pagination.
* **teams_search_groups** — Searches all Microsoft 365 groups by display name substring, including groups that are not Teams. Returns group ID, display name, description, mail, mail nickname, and group types. Use this when you need to search beyond team-enabled groups. Supports pagination.
* **teams_list_channels** — Lists channels in a team. Requires a `team_id` from `teams_list_teams` or `teams_search_teams`. Returns channel ID, display name, and description. Supports pagination.
* **teams_list_channel_messages** — Lists recent messages in a Teams channel. Requires `team_id` and `channel_id`. Returns message ID, sender, body, creation timestamp, and other message properties. Use the returned message `id` with `teams_update_channel_message` or `teams_react_to_channel_message`. Supports pagination.
* **teams_search_users** — Searches Azure AD users by display name, email (`mail`), or user principal name using a case-insensitive substring match. Returns user ID, display name, mail, and user principal name. Supports pagination.
* **teams_post_channel_message** — Posts a plain-text message to a Teams channel. Requires `team_id`, `channel_id`, and message `text`. Returns the posted message, including its `id`. **Application token limitation:** Microsoft Graph accepts application tokens for this API only with `Teamwork.Migrate.All`, which is restricted to migration scenarios. Normal bot-style posting requires a delegated token, which this tool does not obtain. Expect permission errors with a standard app registration.
* **teams_update_channel_message** — Edits an existing channel message. Requires `team_id`, `channel_id`, `message_id`, and the replacement `text`. Subject to the same application-token posting limitation as `teams_post_channel_message`.
* **teams_react_to_channel_message** — Adds an emoji reaction to a channel message. Requires `team_id`, `channel_id`, `message_id`, and a Unicode emoji string (for example, `👍` or `👀`). **Not supported with application tokens.** Microsoft Graph requires the delegated permission `ChannelMessage.Send` for reactions.
* **teams_reply** — Replies to the Teams conversation that triggered the current job via the Bot Framework connector. Requires only the response `text`; the agent does not need channel or message IDs. **Only succeeds on jobs started by a Microsoft Teams chatbot @mention.** On other jobs, it returns an error. The app registration must be the bot that received the mention. Does not use Graph permissions; acquires a Bot Framework token instead.

All read operations (list and search for teams, channels, messages, users, and groups) require only the application permissions above. Posting, editing, reactions, and replies have additional requirements or limitations.

## Create the Microsoft Teams tool

1. In Plural Console, open **Workbenches → Integrations**.
2. Find the **Microsoft Teams** card and click **Add tool**.

### Configure the connection

On the **Configuration** step, enter:

* **Name** — a recognizable name for the connection, such as `teams-production`.
* **Tenant (directory) ID** — the Directory (tenant) ID from the app registration's **Overview** page. Plural uses this in the OAuth token request URL.
* **Application (client) ID** — the Application (client) ID from the same page.
* **Client secret** — the secret **Value** from **Certificates & secrets** in the app registration. Copy this immediately when creating the secret; Entra displays it only once.

Click **Next**.

{% callout severity="warning" %}
Treat the client secret as a credential. Plural stores it encrypted and does not display it after saving. Never include credential values in screenshots, workbench prompts, or job output.
{% /callout %}

### Configure access

On the **Access policy** step, add the users or groups that should have read or write access to this configured tool:

* **Read permissions** control who can access and attach the tool to a workbench.
* **Write permissions** control who can modify the tool configuration and access policy.

Click **Save**. After the creation confirmation appears, the connection is available under **Workbenches → Configured Tools**.

## Attach Microsoft Teams to a workbench

You can attach the tool while creating a workbench or add it to an existing one.

### New workbench

On the final **Attach tools** step of the workbench wizard:

1. Click **Add tools**.
2. Select the Microsoft Teams connection by its configured name.
3. Complete the wizard by clicking **Create workbench**.

### Existing workbench

1. Open the workbench.
2. In the left sidebar, find **Tools** and click **Add tools**. You can also open the overflow menu and select **Tools**.
3. In **Add or remove tool from workbench**, select the Microsoft Teams connection.
4. Click **Save**.

The configured Microsoft Teams tool now appears in the workbench's **Tools** section.

## Use Microsoft Teams from a workbench

Open the workbench's **Launch** tab and describe the task in the prompt box. Include the team name, channel name, search query, or message details as appropriate. The workbench chooses the relevant Microsoft Teams operation.

Try prompts such as:

* **List teams:** `Using Microsoft Teams, list all teams in the tenant and show their display names and descriptions.`
* **Search teams:** `Search Microsoft Teams for teams with "engineering" in the name.`
* **List channels:** `List all channels in the "Product Team" Microsoft Team.`
* **List messages:** `Show the most recent messages from the "general" channel in the "Product Team" Microsoft Team.`
* **Search users:** `Search for users in Azure AD with email addresses containing "smith".`
* **Post a message (application-token limitation applies):** `Post a message to the "alerts" channel in the "SRE" Microsoft Team saying "Deployment to production completed successfully."`
* **Reply (chatbot-triggered jobs only):** `Reply to the person who mentioned the bot: "I've checked the logs and the error rate is back to normal."`

When filtering or specifying teams and channels, use their display names or IDs as returned by the list and search operations. For posting, be aware that application-token posting is restricted by Microsoft to migration scenarios unless you use a delegated token flow.

Submit the job and watch its activity stream. To verify the integration, confirm that the job completes, open its Microsoft Teams tool activity, and check that the call succeeded and returned the expected data. A tool activity entry can also contain a Graph API error, so its presence alone does not verify the connection. For more about job output, see [Running workbench jobs](/plural-features/workbenches/running-jobs).

## Query behavior and limits

Keep these behaviors in mind:

* **Read operations are fully supported.** List and search for teams, channels, messages, users, and groups work with the application permissions documented above.
* **Pagination** — all list and search operations return paginated results with an `@odata.nextLink` property when more data is available. To fetch the next page, pass the exact `@odata.nextLink` string value as the `odata_next_link` parameter in the next call.
* **Posting and editing require delegated tokens.** `teams_post_channel_message` and `teams_update_channel_message` call Microsoft Graph with an application token, which Microsoft restricts to migration scenarios (`Teamwork.Migrate.All`). Normal bot-style posting requires a delegated token with `ChannelMessage.Send`, which this tool does not obtain. Expect permission errors unless you have explicitly configured the migration permission for a migration use case.
* **Reactions are not supported with application tokens.** `teams_react_to_channel_message` requires a delegated token. Calling it with this tool returns a permission error.
* **Reply only works on chatbot-triggered jobs.** `teams_reply` uses the Bot Framework connector and reads the conversation context from jobs started by a Microsoft Teams chatbot @mention. It fails on other jobs with "no teams chat context is available for this job."
* **Search is case-insensitive substring match.** Search operations use `contains(tolower(...))` filters in Microsoft Graph OData queries. Results match any display name, email, or user principal name containing the query substring.
* **Application permission scope** — the app registration needs admin consent for each application permission. Omit permissions for capabilities the workbench does not need.

## Troubleshooting

### Authentication or permission errors

* Confirm that the **Tenant (directory) ID**, **Application (client) ID**, and **Client secret** are correct and belong to the same app registration.
* Verify that the app is registered in the directory (tenant) that owns the teams and users the workbench needs to access.
* For a `403` or permission error from Microsoft Graph, open the app registration's **API permissions** and confirm that every required permission is listed and that **admin consent has been granted**. The status column must show a green checkmark for granted consent.
* If read operations fail, check that `Group.Read.All`, `Channel.ReadBasic.All`, `ChannelMessage.Read.All`, and `User.Read.All` are granted.
* If posting or editing fails with a permission error, remember that these operations require delegated tokens (`ChannelMessage.Send`) or the migration-only permission (`Teamwork.Migrate.All`). This tool uses an application token, so posting is not supported for normal workbench use cases.
* To rotate a secret, open **Workbenches → Configured Tools**, select **Edit configuration**, and enter a new client secret. Existing secret values are never displayed. Create a new secret in the Entra app registration first, then update the Plural configuration.

### No data is returned

* Verify in Microsoft Teams that the expected teams, channels, or messages exist and are visible to the app registration's service principal.
* For an empty team list, confirm that the directory contains team-enabled Microsoft 365 groups and that the app has `Group.Read.All` permission with admin consent.
* For an empty channel list, check that the `team_id` is correct and that the team has channels. Use `teams_list_teams` or `teams_search_teams` to verify the team ID.
* For an empty message list, remember that `teams_list_channel_messages` returns recent messages. Check the channel in the Teams client to confirm messages exist.
* Confirm that the required application permission is granted with admin consent in the app registration.

### Posting, editing, or reactions fail

* `teams_post_channel_message` and `teams_update_channel_message` fail with permission errors unless the app has `Teamwork.Migrate.All` and the posting is part of a migration scenario. Microsoft Graph restricts application-token posting to migration use cases. For normal bot-style posting, use a delegated token flow (outside the scope of this tool) or the `teams_reply` operation on chatbot-triggered jobs.
* `teams_react_to_channel_message` is not supported with application tokens. Microsoft Graph requires the delegated permission `ChannelMessage.Send` for reactions. This operation always fails when called by this tool.
* If you are attempting to migrate messages and have granted `Teamwork.Migrate.All`, verify that the migration headers and payload match Microsoft's migration API requirements. See [Microsoft Graph channel message migration](https://learn.microsoft.com/en-us/graph/api/channel-post-messages).

### Reply operation fails

* `teams_reply` only succeeds on jobs started by a Microsoft Teams chatbot @mention. If the job was started manually or by a webhook trigger, the operation returns "no teams chat context is available for this job."
* Verify that the Microsoft Teams chatbot connection is correctly configured and attached to the workbench. See [Microsoft Teams chatbot](/plural-features/workbenches/integrations/chatbots/teams) for chatbot setup.
* Confirm that the app registration used for the chatbot is the same app used for the Teams tool, or that both have the correct Bot Framework credentials.
* Check that the job's activity shows a chatbot message context with a `serviceUrl` and `conversationId`. Without these, the reply operation cannot determine where to post.

### Search returns unexpected results

* Search operations use `contains` filters with `tolower` for case-insensitive substring matching. Results include any team, group, or user whose relevant field contains the query string.
* `teams_search_teams` filters to team-enabled groups only (`resourceProvisioningOptions/Any(c:c eq 'Team')`). Use `teams_search_groups` to search all Microsoft 365 groups, including non-team groups.
* Verify the search query string. OData single quotes are escaped automatically (`'` becomes `''`), but other OData special characters are not. Use simple alphanumeric queries for best results.

### The Microsoft Teams tool is unavailable

* Confirm that the tool appears under **Workbenches → Configured Tools**.
* Verify that your user or group has read access to the configured tool.
* Reopen the workbench's **Tools** dialog and confirm that the Microsoft Teams connection is selected.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
* [Microsoft Teams chatbot](/plural-features/workbenches/integrations/chatbots/teams)
* [Running workbench jobs](/plural-features/workbenches/running-jobs)
