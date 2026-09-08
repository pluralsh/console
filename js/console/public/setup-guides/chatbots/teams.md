# Microsoft Teams chatbot setup

Connecting a Microsoft Teams chatbot lets a workbench respond when your bot is @mentioned in a Teams channel.
Unlike Slack (which uses an outbound Socket Mode websocket), Teams delivers messages to Plural through an
inbound **Bot Framework webhook**, so the steps below wire Azure Bot Service to Plural's messaging endpoint.

## 1. Register an Azure Bot

1. In the [Azure Portal](https://portal.azure.com), create an **Azure Bot** resource.
2. Choose (or create) a **Microsoft App** for the bot. Note the **Application (client) ID** and **tenant ID**.
3. Under **Certificates & secrets** for that app registration, create a **client secret** and copy the value.

## 2. Point the bot at Plural

1. Create the chatbot connection in Plural first (step 3) so you have its id.
2. In the Azure Bot's **Configuration**, set the **Messaging endpoint** to:

   ```
   https://<your-console-domain>/ext/v1/webhooks/teams/<chat-connection-id>
   ```

3. Enable the **Microsoft Teams** channel on the bot.

## 3. Create the connection in Plural

Fill in the connection form with:

- **Application (client) ID** — the Microsoft App ID from step 1. This is also used to validate the JWT on
  every inbound request.
- **Client secret** — the secret from step 1. Used to mint Bot Framework connector tokens (for replies) and
  Microsoft Graph tokens (for channel/team lookups).
- **Directory (tenant) ID** — the Azure AD tenant the bot is registered in.

## 4. Grant Graph permissions (for channel discovery)

The connection lists teams and channels via Microsoft Graph so you can bind a workbench to a channel. Grant the
app registration application permissions such as **Team.ReadBasic.All** and **Channel.ReadBasic.All**, then have
an admin **grant admin consent**.

## 5. Bind a workbench to a channel

Create a workbench chatbot that targets this connection and the channel you want the bot to listen in. When a
user @mentions the bot in that channel, Plural spawns a workbench job and the agent replies in the conversation
via the Bot Framework connector.

> Note: Microsoft Teams does not support bots setting emoji reactions on messages, so the bot acknowledges and
> responds with messages rather than reactions.
