---
title: Sentry
description: Receive Sentry issue alerts in Plural
---

A Sentry webhook delivers issue alerts from Sentry into Plural. Sentry sends them from an internal integration that you add as an action on an alert rule. Each alert becomes an alert in Plural, keyed by the Sentry issue, so later alerts for the same issue update it. Sentry generates the signing secret, the integration's **Client Secret**, and you paste it into Plural.

An alert does not start a job by itself. A job starts only when a [webhook trigger](/plural-features/workbenches/automation#webhook-triggers) on a workbench matches it, and only when the alert is new. Plural never marks a Sentry alert resolved, so later alerts for the same Sentry issue update it but do not start another job.

## What Plural reads from the payload

Plural accepts only issue alert deliveries, the ones Sentry sends with the `Sentry-Hook-Resource: event_alert` header. The event that triggered the rule is under `data.event`:

```json
{
  "action": "triggered",
  "data": {
    "event": {
      "issue_id": "1117540176",
      "issue_url": "https://sentry.io/api/0/issues/1117540176/",
      "title": "ReferenceError: heck is not defined",
      "exception": {
        "values": [
          {
            "type": "ReferenceError",
            "value": "heck is not defined",
            "stacktrace": {
              "frames": [
                { "filename": "/static/app.js", "lineno": 1, "colno": 10866, "function": "render", "context_line": "heck()" }
              ]
            }
          }
        ]
      },
      "tags": [["level", "error"], ["plrl.flow", "checkout"]]
    },
    "triggered_rule": "Checkout errors"
  }
}
```

* `event.issue_id` identifies the alert. Later alerts for the same Sentry issue update it instead of creating a new one.
* `event.title` becomes the alert title, and `event.issue_url` the link back to Sentry.
* The summary is the title followed by the frames of the first exception's stack trace: file, line, column, function, and the source line for each frame.
* `event.tags` are stored with the alert.

Every Sentry alert is stored as firing with high severity. Plural does not read the event level or the rule name.

A workbench trigger matches against the alert title and summary, not the raw payload. When several triggers on the webhook match, the one with the highest priority wins.

### Associate alerts with a flow

Plural keeps an alert only when a workbench trigger matches it or a `plrl.flow` tag on the event names an existing Plural flow. Otherwise the alert is acknowledged and ignored. Set the tag in your Sentry SDK, for example `Sentry.setTag("plrl.flow", "checkout")`. Plural does not associate Sentry alerts with projects, clusters, or services.

## Authentication

Sentry signs each request in the `Sentry-Hook-Signature` header with the hex HMAC-SHA256 of the raw request body, keyed with the integration's Client Secret. Plural computes the same signature with its stored secret. It also requires `Sentry-Hook-Resource` to be `event_alert`. A request with a missing or wrong signature, or with any other resource, is rejected with 403.

Plural does not check the `Sentry-Hook-Timestamp` header, so a captured request could be replayed.

## Limitations

* **Issue alerts only.** Metric alerts, issue webhooks, comments, errors, and installation events are rejected with 403. Subscribe the integration only to what it needs, and send alerts through an alert rule action.
* **Errors with a stack trace only.** An event whose first exception has no stack trace, such as a captured message, has no summary and is ignored.
* **No resolution.** Resolving the issue in Sentry does not resolve the alert in Plural.
* **One job per Sentry issue.** Because the alert stays firing, a repeat alert for the same issue does not start another job.
* **The secret comes from Sentry.** If you rotate the Client Secret in Sentry, update the secret in Plural.

## Set up the webhook

You need permission to manage integrations in the Sentry organization, and to edit alert rules in the projects you want to send.

### Create an internal integration in Sentry

1. In Sentry, open **Settings → Developer Settings** and create a new internal integration.
2. Enter a name, and set **Webhook URL** to a temporary placeholder such as `https://example.com/plural-placeholder`. You replace it once Plural has created the URL.
3. Turn on **Alert Action** so the integration can be used in alert rules.
4. Save the integration and copy its **Client Secret**.

### Create the webhook in Plural

1. In the Plural Console, open **Settings → Webhooks settings** and click **Create webhook**. You can also create one while adding a [webhook trigger](/plural-features/workbenches/automation#webhook-triggers) to a workbench.
2. Set **Type of webhook** to `Observability` and **Provider type** to `Sentry`.
3. Enter a **Name**, and paste the Sentry Client Secret into **Secret**. Don't generate a new one.
4. Optionally grant users or groups **Read permissions** and **Write permissions** on the webhook.
5. Click **Create** and copy the **Webhook URL**.

### Point Sentry at Plural

1. Back in Sentry, edit the internal integration, replace the placeholder with the Plural webhook URL, and save.
2. Open the issue alert rule you want to send, or create one, and add the action **Send a notification via** your integration.
3. Save the rule.

Then trigger an error that matches the rule and whose title or stack trace matches the workbench trigger. Sentry's [integration platform](https://docs.sentry.io/organization/integrations/integration-platform/) and [issue alert webhook](https://docs.sentry.io/organization/integrations/integration-platform/webhooks/issue-alerts/) pages describe the integration settings and the payload.

## Troubleshooting

* **403 Forbidden**: the secret in Plural is not the integration's Client Secret, or the delivery is not an issue alert. Check that the alert rule uses **Send a notification via** the integration, rather than relying on issue or metric alert webhooks.
* **`{"ignored": true}`**: no trigger matched the alert and it has no `plrl.flow` tag naming an existing flow, or the event has no exception stack trace.
* **No job started**: an alert for the same Sentry issue already started one, or no trigger matched its title and summary.

## Related

* [Webhooks](/plural-features/workbenches/integrations/webhooks)
* [Sentry tool](/plural-features/workbenches/integrations/tools/sentry)
* [Webhook triggers](/plural-features/workbenches/automation#webhook-triggers)
