---
title: Datadog
description: Receive Datadog monitor notifications in Plural
---

A Datadog webhook delivers monitor notifications from the Datadog Webhooks integration into Plural. Each request is one alert. Datadog's default webhook payload does not carry a status Plural can read, so you give the webhook a custom payload that does.

An alert does not start a job by itself. A job starts only when a [webhook trigger](/plural-features/workbenches/automation#webhook-triggers) on a workbench matches the alert, and only when the alert starts firing: the first firing notification for an alert, or a firing notification for an alert that had resolved. Repeat notifications for an alert that is still firing do not start another job, and an alert starts at most one job per workbench per hour.

## What Plural reads from the payload

Use a payload like this one. Every value is a Datadog template variable:

```json
{
  "id": "$ALERT_CYCLE_KEY",
  "title": "$EVENT_TITLE",
  "body": "$TEXT_ONLY_MSG",
  "status": "$ALERT_TYPE",
  "alert_type": "$ALERT_TYPE",
  "priority": "$ALERT_PRIORITY",
  "link": "$LINK",
  "project": "$TAGS[plrl_project]",
  "cluster": "$TAGS[plrl_cluster]"
}
```

* `id` identifies the alert, so a later notification with the same `id` updates it. `$ALERT_CYCLE_KEY` stays the same from the time a monitor triggers until it recovers, so the recovery resolves the same alert. Keep it quoted: an `id` that is not a string is dropped.
* `status` sets the state, falling back to `alert_transition`. Plural matches these lowercase values exactly: `firing`, `triggered`, `trigger`, `alert`, `alerting`, `warning`, `error`, and `critical` are firing. Everything else is resolved, including a missing status.
* `priority` sets the severity: `P1` is critical, `P2` high, `P3` medium, `P4` and `P5` low. Without a priority, `alert_type` sets it: `error` and `critical` are critical, `warning` is medium, and `info` is low.
* `title` becomes the alert title, defaulting to "Datadog Alert". `title` and `body` together become the alert summary. Without a `body`, Plural uses `text_title` or `message`.
* `link` (or `url`) is the link back to Datadog.
* `meta` is stored as annotations. `tags`, as a JSON list of `key:value` strings, is stored as tags.

`$ALERT_TYPE` is `error`, `warning`, `success`, or `info`, so it gives both a status and a severity Plural understands. Do not use `$ALERT_TRANSITION` for `status`. Its values are capitalized (`Triggered`, `Recovered`), and Plural reads them as resolved.

### Associate alerts with Plural resources

Plural keeps an alert only when it belongs to a Plural project, cluster, or service, or when a workbench trigger matches it. Otherwise the request is acknowledged and ignored. Plural looks in these places, in order:

* **Project**: `meta.project`, then `project`, then a `plrl_project`, `project`, or `plural_project` tag.
* **Cluster** (by handle): `meta.cluster`, then `cluster`, then a `plrl_cluster`, `cluster`, or `plural_cluster` tag.
* **Service**: `meta.service` or `service` as `<cluster-handle>/<service-name>`, or a `plrl_service`, `service`, or `plural_service` tag holding the service name when the cluster is also known.

Tags are only read from a JSON list. `$TAGS` renders a comma-separated string, so copy the tags you need into top-level fields with `$TAGS[key]`, as in the payload above.

If no field resolves, Plural looks for markers in the title and summary: `Plural Project: <name>`, `Plural Cluster: <handle>`, and `Plural Service: <name>`, or the forms `plrl-project-<name>`, `plrl-cluster-<handle>`, and `plrl-service-<name>`. A service marker also needs the cluster. You can write these markers in the monitor message.

A workbench trigger matches against the alert title and summary, not the raw payload. When several triggers on the webhook match, the one with the highest priority wins.

## Authentication

Plural checks the HTTP Basic auth password against the webhook secret. The username can be any value. A header that carries the secret in any other form is not accepted, and requests without the right Basic auth password are rejected with 403.

Datadog sends Basic auth in either of two ways:

* **Credentials in the URL.** Insert `plrl:<secret>@` after `https://` in the Plural webhook URL.
* **A custom header.** Set **Custom Headers** to `{"Authorization": "Basic <value>"}`, where the value is the Base64 encoding of `plrl:<secret>`. To keep it out of view, store the encoded value in a Datadog custom variable with **hide from view** checked, and reference it in the header.

## Limitations

* **The default payload never fires.** Datadog's default payload has no `status`, so Plural reads every notification as resolved. Use a custom payload.
* **Use a stable `id`.** `$ID` changes with every notification, so each one becomes a separate alert and a recovery does not resolve the alert that fired.
* **Unrecognized status means resolved.** Plural treats any status it does not recognize as resolved.
* **Monitors only.** The payload above uses monitor variables. Other Datadog notifications that use the same webhook render those variables empty.

## Set up the webhook

### Create the webhook in Plural

1. In the Plural Console, open **Settings → Webhooks settings** and click **Create webhook**. You can also create one while adding a [webhook trigger](/plural-features/workbenches/automation#webhook-triggers) to a workbench.
2. Set **Type of webhook** to `Observability` and **Provider type** to `Datadog`.
3. Enter a **Name** and enter or generate a **Secret**. Names are unique: creating a webhook with the name of an existing observability webhook updates that webhook.
4. Optionally grant users or groups **Read permissions** and **Write permissions** on the webhook.
5. Click **Create** and copy the **Webhook URL**.

### Create the webhook in Datadog

1. In Datadog, open the **Webhooks** integration tile and add a new webhook.
2. Enter a **Name**, for example `plural`. Monitors refer to the webhook by this name.
3. Set **URL** to the Plural webhook URL, with credentials in the URL if you use that option.
4. Replace the **Payload** with the custom payload above.
5. If you use the header option, set **Custom Headers**. Leave **Encode as form** unchecked.
6. Save the webhook.

### Notify the webhook from monitors

Add `@webhook-plural` (with your webhook's name) to the message of each monitor that should reach Plural. Datadog sends the notification when the monitor triggers, warns, and recovers. Add `plrl_project` and `plrl_cluster` tags to the monitor, or write the `Plural Cluster: <handle>` markers into its message, so Plural can associate the alert.

Test the monitor's notification from Datadog, then let it trigger and recover to confirm both states arrive.

## Troubleshooting

* **403 Forbidden**: Basic auth is missing or the password does not match the Plural secret. Check the credentials in the URL or the Base64 value in the `Authorization` header.
* **`{"ignored": true}`**: the alert has no project, cluster, or service association and no trigger matched it.
* **Alerts appear resolved as soon as they fire**: `status` is missing or holds a value Plural does not recognize, such as `$ALERT_TRANSITION`. Send `$ALERT_TYPE`.
* **A recovery does not resolve the alert**: the `id` changes between notifications. Use `$ALERT_CYCLE_KEY`.
* **The request succeeds but no alert appears**: `id` is missing or not a quoted string.

## Related

* [Webhooks](/plural-features/workbenches/integrations/webhooks)
* [Datadog tool](/plural-features/workbenches/integrations/tools/datadog)
* [Webhook triggers](/plural-features/workbenches/automation#webhook-triggers)
