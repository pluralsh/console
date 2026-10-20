---
title: Plural
description: How Plural's own alerts relate to observability webhooks
---

`Plural` is the alert type Plural uses for its own alerts, the ones raised by [log-based monitors](/plural-features/observability/logging#log-based-alerts). Those alerts are created inside Plural and do not arrive through a webhook, so you don't need a webhook source to receive them.

The webhook form also lists `Plural` as an observability provider, but Plural does not accept deliveries on a webhook of this type. Every request to its URL is rejected with 403, whatever authentication it carries. Plural also has no outbound webhook that could send alerts from one Plural environment to another.

## Plural alerts

A monitor runs a log query on a schedule and fires an alert when the result crosses its threshold. The alert is created or updated each time the monitor fires, and resolved when a later run comes back under the threshold. A monitor alert is titled `Plural Monitor <name> is firing` and carries the severity set on the monitor.

A monitor attached to a workbench starts a job on that workbench when its alert starts firing, without a webhook trigger. See [Log-Based Alerts](/plural-features/observability/logging#log-based-alerts) to create a monitor.

## Forward alerts from another system

To bring alerts from an external system into Plural, create a webhook for that provider instead. The [Webhooks](/plural-features/workbenches/integrations/webhooks) page lists the supported observability providers, such as Datadog, Grafana, and PagerDuty.

## Troubleshooting

* **403 Forbidden**: the webhook's provider type is `Plural`. Delete it and create a webhook for the system that actually sends the alerts.

## Related

* [Webhooks](/plural-features/workbenches/integrations/webhooks)
* [Log-Based Alerts](/plural-features/observability/logging#log-based-alerts)
* [Webhook triggers](/plural-features/workbenches/automation#webhook-triggers)
