# Sentry Webhook Setup for Plural

Generate markdown documentation for creating a webhook in Sentry against plural. Plural allows a webhook to have a url and secret, you need to explain to the user how to register those, and how to configure the appropriate triggers so plural can receive events from alerts, issue lifecycle updates, and regressions.

## 1. Create the webhook in Plural

Create webhook details in Plural:

- Type: Observability
- Provider: SENTRY
- Secret: shared secret used for request verification

Copy the Plural webhook URL.

## 2. Register URL and secret in Sentry

In Sentry project/organization integrations for webhooks:

- URL: Plural webhook endpoint
- Secret/signing key: same secret from Plural

Bind the integration to the right projects.

## 3. Configure Sentry triggers

Enable event categories for operational signal flow:

- issue created
- issue regressed
- issue resolved
- alert rule fired/resolved (if configured)

Filter by project and severity to keep event volume relevant.

## 4. Validate and monitor

Trigger a test error and resolve/regress it. Confirm in Plural:

- events arrive with valid signature
- lifecycle changes are represented correctly
- downstream automations can key off these events
