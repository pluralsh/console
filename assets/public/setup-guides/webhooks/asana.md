# Asana Webhook Setup for Plural

Generate markdown documentation for creating a webhook in Asana against plural. Plural allows a webhook to have a url and secret, you need to explain to the user how to register those, and how to configure the appropriate triggers so plural can receive events from alerts, new tickets, and workflow updates.

## 1. Create the webhook in Plural

In Plural, go to the webhook creation flow and choose:

- Type: Ticketing
- Provider: ASANA

Fill in:

- Name: a clear name like Asana Production Tickets
- URL: the callback URL Plural gives you
- Secret: a strong shared secret

Save the webhook in Plural.

## 2. Register URL and secret in Asana

In Asana, open your app or integration settings and create a webhook subscription:

- Target URL: paste the Plural webhook URL
- Secret/token field: paste the same secret from Plural

If Asana requires signing secrets per endpoint, ensure the secret is bound to this exact URL.

## 3. Configure triggers to send events to Plural

Enable triggers that map to operational ticketing activity:

- New task/ticket created
- Task moved to incident/alerts project
- Critical priority changes
- Status transitions for incident-related work

Prefer project-level or workspace-level filters so only relevant events are sent.

## 4. Validate delivery

Trigger a test event in Asana (for example create a test ticket) and verify in Plural:

- request is received
- signature/secret validation succeeds
- event appears in webhook activity

## 5. Troubleshooting

If events fail:

- confirm URL exactly matches the Plural endpoint
- rotate and re-enter the secret on both sides
- ensure the selected project/workspace scope includes the event source
