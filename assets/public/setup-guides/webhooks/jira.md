# Jira Webhook Setup for Plural

Generate markdown documentation for creating a webhook in Jira against plural. Plural allows a webhook to have a url and secret, you need to explain to the user how to register those, and how to configure the appropriate triggers so plural can receive events from alerts, new tickets, and issue transitions.

## 1. Create the webhook in Plural

Configure a webhook in Plural with:

- Type: Ticketing
- Provider: JIRA
- URL: Plural callback endpoint
- Secret: shared signing secret

## 2. Register URL and secret in Jira

In Jira admin settings for webhooks:

- Endpoint URL: paste Plural URL
- Secret or authentication field: paste the Plural secret (if available in your Jira deployment)
- Authentication: configure additional auth headers only if your policy requires it

## 3. Configure Jira trigger events

Enable events commonly used for alert workflows:

- Issue created
- Issue updated
- Issue transitioned
- Issue reopened/resolved

If supported, apply JQL filter to include only incident/alert projects and severities.

## 4. Validate end-to-end

Create and transition a test issue in Jira. In Plural confirm:

- webhook accepted
- signature/secret check passed
- trigger appears with expected metadata

## 5. Best practices

- keep dedicated Jira webhook per environment
- document JQL filters with your on-call process
- rotate secret after team ownership changes
