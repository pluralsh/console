# Linear Webhook Setup for Plural

Generate markdown documentation for creating a webhook in Linear against plural. Plural allows a webhook to have a url and secret, you need to explain to the user how to register those, and how to configure the appropriate triggers so plural can receive events from alerts, new tickets, and issue status updates.

## 1. Create the webhook in Plural

In Plural, create webhook:

- Type: Ticketing
- Provider: LINEAR
- URL: Plural endpoint URL
- Secret: shared secret for request verification

## 2. Register URL and secret in Linear

In Linear workspace settings under API/Webhooks:

- Webhook URL: paste Plural URL
- Secret/signing key: paste same secret from Plural

If Linear signs payloads, make sure Plural validates against this exact secret.

## 3. Configure event subscriptions

Enable the events that should drive Plural automation:

- Issue created (new tickets)
- Issue updated
- Priority changed
- State changed (triaged/in progress/done)

Use team-based filters if only certain teams should send webhook data.

## 4. Verify integration

Create a test issue and transition its state. In Plural verify:

- request accepted
- event recorded
- downstream automation or trigger evaluation runs correctly

## 5. Maintenance

- keep webhook ownership documented in your runbook
- rotate secrets on schedule
