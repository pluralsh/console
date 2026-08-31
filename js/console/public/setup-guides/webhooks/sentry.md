# Sentry Webhook Setup for Plural

References:
- [Sentry - Issue Alerts for webhook integrations](https://docs.sentry.io/organization/integrations/integration-platform/webhooks/issue-alerts/)
- [Sentry Help - Issue webhooks vs alert rules](https://sentry.zendesk.com/hc/en-us/articles/41592230359835-Why-do-issues-get-pushed-to-my-webhook-integration-even-when-alert-rules-do-not-trigger)

## 1. Create the webhook in Plural first

In Plural:

1. Set **Type** to `Observability`.
2. Set **Provider** to `SENTRY`.
3. Enter a webhook **Name**.
4. Enter a **Signing secret**.
5. Click **Create new webhook**.

Copy the generated webhook URL.

## 2. Configure webhook integration in your Sentry org

Open your Sentry host (for example `https://<your-sentry-host>/`) and configure the webhook integration/action to POST to the Plural URL.

If your Sentry setup allows custom auth headers, send HTTP Basic Auth with:

- username: any non-empty value
- password: the Plural signing secret

## 3. Configure notifications

Enable only the event streams you need:

- issue alert events (rule-triggered)
- issue lifecycle events (created/resolved/regressed) only if required

This avoids duplicate/noisy deliveries.

## 4. Validate

Trigger a test error and an alert-rule event, then confirm in Plural:

- request accepted
- auth/verification succeeds
- lifecycle and alert events are mapped correctly
