---
title: PagerDuty
description: Receive PagerDuty incident events in Plural
---

A PagerDuty webhook delivers incident events from a PagerDuty V3 webhook subscription into Plural. Each event is one alert, keyed by the PagerDuty incident, so later events for the same incident update it. PagerDuty generates the signing secret, and you paste it into Plural.

An alert does not start a job by itself. A job starts only when a [webhook trigger](/plural-features/workbenches/automation#webhook-triggers) on a workbench matches the alert, and only when the incident starts firing: the first event for an incident, or an event that reopens a resolved incident. An acknowledgment or another update to an open incident does not start another job, and an incident starts at most one job per workbench per hour.

## What Plural reads from the payload

PagerDuty sends one event per request, with the incident under `event.data`:

```json
{
  "event": {
    "id": "5ac64822-4adc-4fda-ade0-410becf0de4f",
    "event_type": "incident.triggered",
    "data": {
      "id": "PGR0VU2",
      "type": "incident",
      "html_url": "https://acme.pagerduty.com/incidents/PGR0VU2",
      "title": "Checkout latency high (Plural Cluster: prod-us-east)",
      "status": "triggered",
      "priority": { "summary": "P1" }
    }
  }
}
```

* `data.id` identifies the alert, falling back to `event.id`.
* `data.status` sets the state. `resolved` is resolved. Everything else, including `triggered` and `acknowledged`, is firing.
* `data.title` becomes the alert title, and `data.html_url` the link back to PagerDuty.
* `data.priority.summary` sets the severity: `P1` is critical, `P2` high, `P3` and `P4` medium, and `P5` low. A missing priority or another priority name leaves the severity undefined.
* `data.summary`, when present, becomes the alert summary. Otherwise the summary reads "No summary available".
* `data.custom_details`, when present, is stored as tags.

### Associate alerts with Plural resources

Plural keeps an alert only when it belongs to a Plural project, cluster, or service, or when a workbench trigger matches it. Otherwise the event is acknowledged and ignored.

Plural first reads `plrl_project` (the project name), `plrl_cluster` (the cluster handle), and `plrl_service` (the service name on that cluster, together with `plrl_cluster`) from `data.custom_details`. For any of the three it does not find there, it looks for markers in the incident title and summary: `Plural Project: <name>`, `Plural Cluster: <handle>`, and `Plural Service: <name>`, or the forms `plrl-project-<name>`, `plrl-cluster-<handle>`, and `plrl-service-<name>`. A service marker also needs the cluster. Putting a marker in the incident title, for example from the alert that opens the incident, is the most direct way to associate it.

A workbench trigger matches against the alert title and summary, not the raw payload. When several triggers on the webhook match, the one with the highest priority wins.

## Authentication

PagerDuty signs each request in the `X-PagerDuty-Signature` header with `v1=` followed by the hex HMAC-SHA256 of the raw request body, keyed with the webhook's signing secret. Plural computes the same signature with its stored secret and accepts the request if any of the comma-separated signatures in the header matches. Requests without the header or with no matching signature are rejected with 403.

Plural does not check timestamps, so a captured request could be replayed.

## Limitations

* **V3 webhooks only.** V1 and V2 webhook extensions use a different payload format and are not supported.
* **Subscribe to incident events.** Plural reads every event's `data` as an incident. Events about other objects, such as notes or services, do not describe an incident's state.
* **Acknowledged is still firing.** Only `resolved` resolves the alert.
* **The secret comes from PagerDuty.** PagerDuty shows it once, when you create the webhook. If you lose it, regenerate it in PagerDuty and update the secret in Plural.

## Set up the webhook

### Create the webhook in PagerDuty

1. In PagerDuty, open **Integrations → Generic Webhooks (v3)** and click **New Webhook**. To scope events to one service instead, open the service in the **Service Directory**, select the **Integrations** tab, and add a webhook there.
2. Set **Webhook URL** to a temporary placeholder, such as `https://example.com/plural-placeholder`. You replace it once Plural has created the URL.
3. Under **Event Subscription**, select at least the incident `triggered`, `acknowledged`, and `resolved` events. Add `reopened` if reopened incidents should start a job again.
4. Click **Add Webhook** and copy the signing secret from the confirmation dialog.

### Create the webhook in Plural

1. In the Plural Console, open **Settings → Webhooks settings** and click **Create webhook**. You can also create one while adding a [webhook trigger](/plural-features/workbenches/automation#webhook-triggers) to a workbench.
2. Set **Type of webhook** to `Observability` and **Provider type** to `PagerDuty`.
3. Enter a **Name**, and paste the PagerDuty signing secret into **Secret**. Names are unique: creating a webhook with the name of an existing observability webhook updates that webhook.
4. Optionally grant users or groups **Read permissions** and **Write permissions** on the webhook.
5. Click **Create** and copy the **Webhook URL**.

### Point PagerDuty at Plural

Back in PagerDuty, edit the webhook, replace the placeholder with the Plural webhook URL, and save. Use **Send Test Event** to check delivery, then trigger and resolve a test incident.

## Troubleshooting

* **403 Forbidden**: the secret in Plural is not the PagerDuty signing secret. Regenerate the secret in PagerDuty if you no longer have it, and update the webhook in Plural.
* **`{"ignored": true}`**: the incident has no project, cluster, or service association and no trigger matched it, or the payload has no `event.data`. PagerDuty's test event is acknowledged this way, which still confirms the signature is valid.
* **No job started**: the incident was stored but no trigger matched its title and summary, or it was already firing.

## Related

* [Webhooks](/plural-features/workbenches/integrations/webhooks)
* [PagerDuty tool](/plural-features/workbenches/integrations/tools/pagerduty)
* [Webhook triggers](/plural-features/workbenches/automation#webhook-triggers)
