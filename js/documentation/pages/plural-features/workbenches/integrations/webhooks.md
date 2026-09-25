---
title: Webhooks
description: Observability and issue webhook sources that can start workbench jobs
---

Webhook sources deliver events into Plural from systems outside the workbench. A source is either an **observability** webhook (alerting systems such as Datadog, Grafana, or PagerDuty) or an **issue** webhook (trackers such as Jira, Linear, or GitHub).

Creating the source registers a Plural webhook URL and signing secret in the external system. It does not, by itself, start a job. To run a workbench when a payload matches, add a trigger on the workbench. See [Webhook triggers](/plural-features/workbenches/automation#webhook-triggers).

Observability webhook sources are also documented under [Observability Webhooks](/plural-features/observability/observability-webhooks).

## Capabilities

* **Observability** — receive alert payloads from an external monitoring system.
* **Issue** — receive issue and pull-request events from a tracker or source-control provider.

## Setup

Console shows an inline setup guide while you create a webhook source. Follow that guide for the provider's URL, signing secret, and required permissions.

## Related

* [Integrations](/plural-features/workbenches/integrations) — how tools, webhooks, and chatbots differ
* [Automating workbench jobs](/plural-features/workbenches/automation#webhook-triggers) — match a payload and start a job
