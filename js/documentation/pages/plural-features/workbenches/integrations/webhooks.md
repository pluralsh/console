---
title: Webhooks
description: Observability and issue webhook sources that can start workbench jobs
---

Webhook sources deliver events into Plural from systems outside the workbench. A source is either an **observability** webhook (alerting systems such as Datadog, Grafana, or PagerDuty) or an **issue** webhook (an issue tracker or a source-control provider).

Creating the source produces a Plural webhook URL. Authenticate that URL the way the provider requires; each provider page below describes its own secret or handshake. The source does not, by itself, start a job. To run a workbench when a payload matches, add a trigger on the workbench. See [Webhook triggers](/plural-features/workbenches/automation#webhook-triggers).

Observability webhook sources are also documented under [Observability Webhooks](/plural-features/observability/observability-webhooks).

## Capabilities

* **Observability** — receive alert payloads from an external monitoring system. Sources: [AlertOps](/plural-features/workbenches/integrations/webhooks/alertops), [Datadog](/plural-features/workbenches/integrations/webhooks/datadog) monitor notifications, [Grafana](/plural-features/workbenches/integrations/webhooks/grafana) contact points, [New Relic](/plural-features/workbenches/integrations/webhooks/new-relic) workflows, [PagerDuty](/plural-features/workbenches/integrations/webhooks/pagerduty) V3 incident events, and [Sentry](/plural-features/workbenches/integrations/webhooks/sentry) issue alerts from an internal integration. Plural's own monitor alerts are raised internally and need no webhook; see [Plural](/plural-features/workbenches/integrations/webhooks/plural).
* **Issue** — receive issue events from a tracker ([Asana](/plural-features/workbenches/integrations/webhooks/asana), [Azure DevOps](/plural-features/workbenches/integrations/webhooks/azure-devops), [Jira](/plural-features/workbenches/integrations/webhooks/jira), [Linear](/plural-features/workbenches/integrations/webhooks/linear), [ServiceNow](/plural-features/workbenches/integrations/webhooks/service-now)), or pull-request events from a source-control provider ([Bitbucket Cloud](/plural-features/workbenches/integrations/webhooks/bitbucket), [Bitbucket Data Center](/plural-features/workbenches/integrations/webhooks/bitbucket-datacenter), [GitHub](/plural-features/workbenches/integrations/webhooks/github), [GitLab](/plural-features/workbenches/integrations/webhooks/gitlab)).

## Setup

Each provider page above walks through creating the source in Console, registering the URL and secret in the provider, and troubleshooting failed deliveries. Console also shows an inline setup guide while you create a webhook source.

## Related

* [Integrations](/plural-features/workbenches/integrations) — how tools, webhooks, and chatbots differ
* [Automating workbench jobs](/plural-features/workbenches/automation#webhook-triggers) — match a payload and start a job
