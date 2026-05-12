# Datadog Webhook Setup for Plural

References:
- [Datadog - Webhooks Integration API](https://docs.datadoghq.com/api/latest/webhooks-integration/)
- [Datadog - Calling APIs with webhooks integration](https://docs.datadoghq.com/developers/guide/calling-on-datadog-s-api-with-the-webhooks-integration/)

## 1. Create the webhook in Plural first

In Plural:

1. Set **Type** to `Observability`.
2. Set **Provider** to `DATADOG`.
3. Enter a webhook **Name**.
4. Enter a **Signing secret**.
5. Click **Create new webhook**.

Copy the generated Plural webhook URL.

## 2. Create webhook in Datadog

In Datadog (`https://app.datadoghq.com/` or your Datadog site):

1. Create/configure a Webhooks integration endpoint
2. Set URL to the Plural webhook URL
3. Configure authentication so Plural can verify calls

Use one of:

- HTTP Basic Auth where supported (password = Plural signing secret), or
- Custom auth header carrying the same secret value

## 3. Trigger from monitors/incidents

Reference the webhook integration from monitor notifications (`@webhook-<name>`) and include both alert and recovery paths.

Recommended events:

- monitor alert/firing
- monitor recovery
- incident lifecycle transitions

## 4. Validate

Trigger a test monitor alert and recovery, then confirm in Plural:

- request accepted
- auth validated
- monitor state transitions are captured
