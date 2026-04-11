# GitHub Webhook Setup for Plural

Generate markdown documentation for creating a webhook in GitHub against plural. Plural allows a webhook to have a url and secret, you need to explain to the user how to register those, and how to configure the appropriate triggers so plural can receive events from alerts, new tickets, and issue lifecycle updates.

## 1. Create the webhook in Plural

Create a new webhook in Plural with:

- Type: Ticketing
- Provider: GITHUB
- URL: Plural callback URL
- Secret: shared secret used for signature verification

## 2. Register URL and secret in GitHub

In GitHub repository or organization settings:

- go to Webhooks
- click Add webhook
- Payload URL: paste the Plural URL
- Secret: paste the same secret configured in Plural
- Content type: application/json

## 3. Configure GitHub events

Select events relevant to ticketing and alerts, for example:

- Issues (opened, edited, closed, reopened)
- Issue comments
- Label changes
- Projects if your team routes alert tickets through boards

Use either individual events or Send me everything only in non-production environments.

## 4. Test and verify

Use GitHub's ping/test delivery and also create a test issue. In Plural, verify:

- delivery succeeded (2xx)
- event parsed successfully
- issue/ticket event appears in webhook history

## 5. Security recommendations

- use a unique secret per webhook
- rotate periodically
- restrict admin rights for webhook management
