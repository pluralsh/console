---
title: AlertOps
description: Receive AlertOps alerts in Plural
---

An AlertOps webhook delivers alerts from an AlertOps outbound integration into Plural. You define the request body in AlertOps, so you choose which fields Plural receives. Plural reads the Standard Alert template fields, plus keys that associate the alert with Plural resources. Each request is one alert, keyed by the AlertOps incident ID, so later requests for the same incident update it.

An alert does not start a job by itself. A job starts only when a [webhook trigger](/plural-features/workbenches/automation#webhook-triggers) on a workbench matches the alert, and only when the alert starts firing: the first firing request for an incident, or a firing request for one that had resolved. Updates to an incident that is still firing do not start another job, and an incident starts at most one job per workbench per hour.

## What Plural reads from the payload

```json
{
  "IncidentId": "<IncidentId>",
  "IncidentSubject": "<IncidentSubject>",
  "IncidentStatus": "<IncidentStatus>",
  "IncidentSeverity": "<IncidentSeverity>",
  "IncidentURL": "<IncidentURL>",
  "IncidentShortText": "<IncidentShortText>",
  "IncidentLongText": "<IncidentLongText>",
  "plrl_project": "payments",
  "plrl_cluster": "prod-us-east",
  "plrl_service": "checkout"
}
```

* `IncidentId` identifies the alert. Requests without it all update one shared alert.
* `IncidentSubject` becomes the alert title, and `IncidentURL` the link back to AlertOps.
* `IncidentLongText` becomes the alert summary, falling back to `IncidentShortText` and then `IncidentSubject`.
* `IncidentStatus` sets the state. `OK`, `CLOSE`, `CLOSED`, and `RESOLVED`, in any case, are resolved. Everything else is firing.
* `IncidentSeverity` sets the severity, in any case:

| Severity | AlertOps values |
|---|---|
| Critical | `CRITICAL`, `SEV1` |
| High | `MAJOR`, `HIGH`, `SEV2` |
| Medium | `WARNING`, `MEDIUM`, `SEV3` |
| Low | `MINOR`, `LOW`, `INFO`, `SEV4`, `SEV5` |

Any other value leaves the severity undefined. An optional `tags` object with string values is stored as tags.

### Associate alerts with Plural resources

Plural keeps an alert only when it belongs to a Plural project, cluster, or service, or when a workbench trigger matches it. Otherwise the request is acknowledged and ignored. Add these top-level keys to the body:

* `plrl_project`: the project name.
* `plrl_cluster`: the cluster handle.
* `plrl_service`: the service name on that cluster. It only applies together with `plrl_cluster`.

If you cannot add them as top-level keys, write markers into `IncidentLongText` or the subject instead: `Plural Project: <name>`, `Plural Cluster: <handle>`, and `Plural Service: <name>`, or the forms `plrl-project-<name>`, `plrl-cluster-<handle>`, and `plrl-service-<name>`. A service marker also needs the cluster.

A workbench trigger matches against the alert title and summary, not the raw payload. When several triggers on the webhook match, the one with the highest priority wins.

## Authentication

Plural checks the HTTP Basic auth password against the webhook secret. The username can be any value. Requests without Basic auth or with the wrong password are rejected with 403.

## Limitations

* **Field names are fixed.** Plural only reads the Standard Alert field names above. A body that uses other names gets a placeholder title and ID, so all such requests update the same alert.
* **Close events need a resolved status.** Plural resolves an alert only on the statuses above. Make sure the workflow also sends the request when an alert closes.
* **Basic auth only.** Set **Web Security Type** to **Basic**.

## Set up the webhook

### Create the webhook in Plural

1. In the Plural Console, open **Settings → Webhooks settings** and click **Create webhook**. You can also create one while adding a [webhook trigger](/plural-features/workbenches/automation#webhook-triggers) to a workbench.
2. Set **Type of webhook** to `Observability` and **Provider type** to `AlertOps`.
3. Enter a **Name** and enter or generate a **Secret**. Names are unique: creating a webhook with the name of an existing observability webhook updates that webhook.
4. Optionally grant users or groups **Read permissions** and **Write permissions** on the webhook.
5. Click **Create** and copy the **Webhook URL**.

### Create an outbound integration in AlertOps

1. In AlertOps, open **Configuration → Integrations → Outbound Integration** and click **Add Outbound Integration**.
2. Set **Service Name** to something recognizable, such as `Plural`.
3. Set **Web Security Type** to **Basic**, with any non-empty **UserName** and the Plural secret as the **Password**.
4. Click **Save**.

### Add a method that posts to Plural

On the new outbound integration, click **Add Method** and set:

* **Method Name**: `Plural Create Alert`
* **Service Type**: `REST`
* **Template Type**: `Standard Alert`
* **URI**: the Plural webhook URL
* **Content Type**: `JSON`
* **Web Method**: `POST`
* **Request Data**: the body above, with the `plrl_*` values set to your project name, cluster handle, and service name.

### Attach the method to a workflow

1. Open **Configuration → Workflows** and click **Add Workflow**.
2. Add an **Outbound Service Notification** action that targets the `Plural Create Alert` method.
3. Trigger it when an alert is created, updated, and closed, so Plural sees both firing and resolved states.
4. Attach the workflow to the relevant escalation policy.

Trigger a test alert in AlertOps, then close it to confirm the alert resolves in Plural.

## Troubleshooting

* **403 Forbidden**: Web Security Type is not Basic, or the password does not match the Plural secret.
* **`{"ignored": true}`**: the alert has no project, cluster, or service association and no trigger matched it. Check that `plrl_cluster` is a cluster handle and `plrl_service` is a plain service name on that cluster.
* **Alert never resolves**: the close request is not sent, or its `IncidentStatus` is not one of the resolved values.

## Related

* [Webhooks](/plural-features/workbenches/integrations/webhooks)
* [Webhook triggers](/plural-features/workbenches/automation#webhook-triggers)
