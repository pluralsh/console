# Grafana Webhook Setup for Plural

Generate markdown documentation for creating a webhook in Grafana against plural. Plural allows a webhook to have a url and secret, you need to explain to the user how to register those, and how to configure the appropriate triggers so plural can receive events from alerts and alert rule state transitions.

## 1. Create the webhook in Plural

Create a webhook in Plural with:

- Type: Observability
- Provider: GRAFANA
- Secret: shared webhook secret

Use the URL provided by Plural for incoming events.

## 2. Register URL and secret in Grafana

In Grafana Alerting contact points:

- Contact point type: Webhook
- URL: paste the Plural webhook URL
- Secret/signature key: paste the Plural secret

Set optional fields (headers, auth) only if your policy requires them.

## 3. Configure Grafana triggers

Bind the contact point to notification policies and routes for:

- firing alerts
- resolved alerts
- selected folders/labels for incident-relevant rules

Route only high-signal alerts to avoid noisy webhook traffic.

## 4. Validate integration

Use Grafana test notification and a real alert simulation. In Plural verify:

- request accepted
- signature check passed
- firing and resolved events are visible
