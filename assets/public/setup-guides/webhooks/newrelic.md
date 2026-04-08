# New Relic Webhook Setup for Plural

Generate markdown documentation for creating a webhook in New Relic against plural. Plural allows a webhook to have a url and secret, you need to explain to the user how to register those, and how to configure the appropriate triggers so plural can receive events from alerts and incident lifecycle changes.

## 1. Create the webhook in Plural

Create webhook details in Plural:

- Type: Observability
- Provider: NEWRELIC
- Secret: shared secret for verification

Copy the Plural webhook URL.

## 2. Register URL and secret in New Relic

In New Relic workflows/destinations:

- Destination type: webhook
- URL: Plural webhook URL
- Secret/signing credential: same secret as in Plural

Ensure destination is enabled and reachable from New Relic.

## 3. Configure trigger workflows

Attach destination to workflows with conditions such as:

- incident created/opened
- incident acknowledged
- incident closed
- policy/condition severity changes

Filter by account, policy, or tags to keep routing precise.

## 4. Test and verify

Send a test payload from New Relic and open a test incident. In Plural verify:

- authenticated delivery
- expected incident events captured
- trigger automation reacts to open/close events
