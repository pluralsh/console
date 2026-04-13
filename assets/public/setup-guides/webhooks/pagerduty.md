# PagerDuty Webhook Setup for Plural

Generate markdown documentation for creating a webhook in PagerDuty against plural. Plural allows a webhook to have a url and secret, you need to explain to the user how to register those, and how to configure the appropriate triggers so plural can receive events from alerts, incidents, and escalation lifecycle changes.

## 1. Create the webhook in Plural

Configure webhook in Plural:

- Type: Observability
- Provider: PAGERDUTY
- Secret: shared secret

Copy the Plural webhook URL.

## 2. Register URL and secret in PagerDuty

In PagerDuty extensions/webhooks or event orchestration actions:

- URL: Plural webhook endpoint
- Secret/signing token: same value as Plural secret

Choose the service(s) tied to your incident flow.

## 3. Configure incident triggers

Enable/route events such as:

- incident triggered
- incident acknowledged
- incident resolved
- escalation events (if needed)

Prefer service-level filtering so only relevant incidents are sent.

## 4. Validate end-to-end

Create a test incident in PagerDuty. Confirm in Plural:

- event accepted
- secret validated
- incident state updates reflected
