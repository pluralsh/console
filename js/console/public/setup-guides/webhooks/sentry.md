# Sentry Webhook Setup for Plural

References:
- [Sentry - Integration Platform](https://docs.sentry.io/organization/integrations/integration-platform/)
- [Sentry - Issue Alerts for webhook integrations](https://docs.sentry.io/organization/integrations/integration-platform/webhooks/issue-alerts/)

Sentry generates the signing secret: it is the **Client Secret** of a Sentry internal integration. Plural verifies the `Sentry-Hook-Signature` header (hex HMAC-SHA256 of the request body) with that secret and only accepts issue alert deliveries (`Sentry-Hook-Resource: event_alert`). Basic auth is not used.

## 1. Create an internal integration in Sentry and copy its Client Secret

In Sentry, open **Settings** -> **Developer Settings** and create a new internal integration:

1. Enter a name.
2. Set **Webhook URL** to a temporary placeholder (for example `https://example.com/plural-webhook-placeholder`).
3. Turn on **Alert Action**.
4. Save, then copy the integration's **Client Secret**.

## 2. Create the webhook in Plural

In Plural:

1. Set **Type of webhook** to `Observability`.
2. Set **Provider type** to `Sentry`.
3. Enter webhook **Name**.
4. Paste the Sentry Client Secret as the Plural **Secret** (don't generate a new one).
5. Click **Create**.

Copy the Plural-generated webhook URL.

## 3. Point Sentry at Plural

1. Edit the internal integration and replace the placeholder **Webhook URL** with the Plural webhook URL.
2. In the issue alert rule you want to forward, add the action **Send a notification via** your integration, and save the rule.

Metric alerts, issue webhooks, and other resources are rejected with 403. Only issue alert rule actions are accepted.

## 4. Validate

Trigger an error that matches the alert rule and confirm in Plural:

- request accepted (403 means the secret is not the Client Secret, or the delivery is not an issue alert)
- the alert appears

Plural only keeps a Sentry alert that matches a workbench trigger, or whose event has a `plrl.flow` tag naming an existing Plural flow. Events without an exception stack trace are ignored. Sentry alerts always stay firing, so a repeat alert for the same Sentry issue does not start another workbench job.
