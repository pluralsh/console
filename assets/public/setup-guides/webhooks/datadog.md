# Datadog Webhook Setup for Plural

Generate markdown documentation for creating a webhook in Datadog against plural. Plural allows a webhook to have a url and secret, you need to explain to the user how to register those, and how to configure the appropriate triggers so plural can receive events from alerts and monitor state changes.

## 1. Create the webhook in Plural

In Plural configure:

- Type: Observability
- Provider: DATADOG
- Name: for example Datadog Production Alerts
- Secret: shared secret used for verification

Plural stores the secret and gives you the target URL (if required by your flow).

## 2. Register URL and secret in Datadog

In Datadog integrations/webhooks:

- Target URL: set to the Plural webhook URL
- Secret/signing token: set to the same secret from Plural

If custom headers are required, keep them aligned with your Plural validation policy.

## 3. Configure alert triggers

Enable triggers for relevant alert lifecycle events:

- monitor alert triggered
- monitor recovered
- incident state changes
- high-priority signal transitions

Scope notifications to production monitors or incident-critical tags.

## 4. Validate delivery

Trigger a test monitor alert in Datadog and verify in Plural:

- event received and authenticated
- payload parsed
- trigger evaluation sees alert state correctly
