# Plural Webhooks

`Plural` is the alert type for Plural's own alerts, which come from log-based monitors. Those alerts are created inside Plural and do not need a webhook.

Plural does not accept deliveries on an observability webhook with provider type `Plural`: every request to its URL is rejected with 403. Plural also has no outbound webhook that could forward alerts to another Plural environment.

- To alert on Plural data, create a monitor on a service under **Observability** -> **Monitors**.
- To receive alerts from an external system, create a webhook with that system's provider type instead, such as Datadog, Grafana, or PagerDuty.
