---
title: Grafana
description: Receive Grafana alert notifications in Plural
---

A Grafana webhook delivers alert notifications from a Grafana webhook contact point into Plural. Each notification can carry several alerts, and Plural stores each one as its own alert, both when it fires and when it resolves.

An alert does not start a job by itself. A job starts only when a [webhook trigger](/plural-features/workbenches/automation#webhook-triggers) on a workbench matches the alert, and only when the alert starts firing: the first firing notification for an alert, or a firing notification for an alert that had resolved. Repeat notifications for an alert that is still firing do not start another job, and an alert starts at most one job per workbench per hour.

## What Plural reads from the payload

Plural reads Grafana's default webhook payload:

```json
{
  "title": "[FIRING:1] High memory usage (blue)",
  "message": "**Firing** ...",
  "commonLabels": { "team": "blue" },
  "alerts": [
    {
      "status": "firing",
      "fingerprint": "c6eadffa33fcdf37",
      "generatorURL": "https://grafana.example.com/alerting/1afz29v7z/edit",
      "labels": {
        "alertname": "High memory usage",
        "plrl_cluster": "prod-us-east",
        "plrl_service": "checkout"
      },
      "annotations": {
        "summary": "Memory above 90% on checkout",
        "severity": "high"
      }
    }
  ]
}
```

* Each entry in `alerts` becomes one alert. `commonLabels` and `commonAnnotations` are merged into every entry.
* `fingerprint` identifies the alert, so a later notification for the same fingerprint updates it.
* `status` sets the state. `firing` is firing, anything else is resolved.
* The top-level `title` becomes the alert title, falling back to the `alertname` label.
* The `summary` annotation and the top-level `message` become the alert summary.
* `generatorURL` is the link back to Grafana.
* The `severity` annotation sets the severity when it is `low`, `medium`, `high`, or `critical`. Any other value, or a `severity` label instead of an annotation, leaves the severity undefined.
* Labels with string values are stored as tags.

Plural stores the whole payload with the alert. The workbench alert details show the evaluated query values from `values` and a link to Grafana's `silenceURL`.

### Associate alerts with Plural resources

Plural keeps an alert only when it belongs to a Plural project, cluster, or service, or when a workbench trigger matches it. Otherwise the notification is acknowledged and ignored. Set these labels on the alert rule:

* `plrl_project`: the project name.
* `plrl_cluster`: the cluster handle.
* `plrl_service`: the service name on that cluster. It only applies together with `plrl_cluster`.

If a label is missing, Plural looks for markers in the alert title and summary instead: `Plural Project: <name>`, `Plural Cluster: <handle>`, and `Plural Service: <name>`, or the forms `plrl-project-<name>`, `plrl-cluster-<handle>`, and `plrl-service-<name>`. A service marker also needs the cluster.

A workbench trigger matches against the alert title and summary, not the raw payload. When several triggers on the webhook match, the one with the highest priority wins.

## Authentication

Plural checks the HTTP Basic auth password against the webhook secret. The username can be any value. Requests without Basic auth or with the wrong password are rejected with 403.

## Limitations

* **One failing alert drops the notification.** Plural stores the alerts in a notification together. If one of them has no association and no matching trigger, none of them are stored. Group alerts in the notification policy, for example by `plrl_cluster`, so each notification covers related alerts.
* **Title and message are per notification.** The top-level `title` and `message` describe the whole group, so a trigger or marker that matches that text applies to every alert in the notification.
* **Default payload only.** Plural reads the default webhook payload. A custom payload template that changes its shape is ignored.
* **Basic auth only.** Do not also set an `Authorization` header or bearer token on the contact point.

## Set up the webhook

### Create the webhook in Plural

1. In the Plural Console, open **Settings → Webhooks settings** and click **Create webhook**. You can also create one while adding a [webhook trigger](/plural-features/workbenches/automation#webhook-triggers) to a workbench.
2. Set **Type of webhook** to `Observability` and **Provider type** to `Grafana`.
3. Enter a **Name** and enter or generate a **Secret**. Names are unique: creating a webhook with the name of an existing observability webhook updates that webhook.
4. Optionally grant users or groups **Read permissions** and **Write permissions** on the webhook.
5. Click **Create** and copy the **Webhook URL**. Plural only shows the URL after the webhook is created.

### Create a contact point in Grafana

1. In Grafana, open **Alerts & IRM → Alerting → Contact points** and click **+ Add contact point**.
2. Set **Integration** to `Webhook` and **URL** to the Plural webhook URL.
3. Under the optional webhook settings, set **HTTP Basic Authentication** with any non-empty username and the Plural secret as the password.
4. Leave resolved messages turned on, so Plural sees when an alert resolves.
5. Save the contact point.

### Route alerts to the contact point

Attach the contact point to a notification policy that matches the alerts you want Plural to see, using labels, folders, or other matchers to keep the volume down. Add the `plrl_*` labels to those alert rules, or the markers to their summary, so Plural can associate them.

Use the contact point's test button to check delivery, then fire and resolve a real alert to confirm both states arrive.

## Troubleshooting

* **403 Forbidden**: Basic auth is missing or the password does not match the Plural secret.
* **`{"ignored": true}`**: the payload has no `alerts` list, or at least one alert has no project, cluster, or service association and no matching trigger. A Grafana test notification usually falls in this case unless a trigger matches it.
* **No job started**: the alert was stored but no trigger matched its title and summary, or the alert was already firing.
* **Severity is undefined**: set `severity` as an annotation, in lowercase.

## Related

* [Webhooks](/plural-features/workbenches/integrations/webhooks)
* [Webhook triggers](/plural-features/workbenches/automation#webhook-triggers)
