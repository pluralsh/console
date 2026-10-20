---
title: New Relic
description: Receive New Relic issue notifications in Plural
---

A New Relic webhook delivers issue notifications from a New Relic workflow into Plural. Each notification is one alert, keyed by the New Relic issue ID, so later notifications for the same issue update it.

An alert does not start a job by itself. A job starts only when a [webhook trigger](/plural-features/workbenches/automation#webhook-triggers) on a workbench matches the alert, and only when the issue starts firing: the first activated notification for an issue, or one that follows a resolved notification. Later notifications for an issue that is still active do not start another job, and an issue starts at most one job per workbench per hour.

## What Plural reads from the payload

Plural reads the fields of the workflow's default webhook payload:

```json
{
  "id": "d1b1f3fd-995a-4066-88ab-8ce4f6960654",
  "issueUrl": "https://radar-api.service.newrelic.com/accounts/1/issues/0ea2df1c-...",
  "title": "Memory Used % > 90 for at least 2 minutes on 'checkout'",
  "priority": "CRITICAL",
  "state": "ACTIVATED",
  "alertConditionNames": ["Memory high"],
  "plural": "plrl_project: payments, plrl_cluster: prod-us-east, plrl_service: checkout"
}
```

* `id` identifies the alert. Keep the issue ID here: notifications without an `id` all update one shared alert.
* `state` sets the state. `ACTIVATED` is firing and `RESOLVED` is resolved. Plural does not store a notification with any other state, including New Relic's `CREATED` and `CLOSED`. See [Send closed issues as resolved](#send-closed-issues-as-resolved).
* `title` becomes the alert title, and `issueUrl` the link back to New Relic.
* `priority` sets the severity: `CRITICAL` is critical, and every other priority is medium.
* `title` and `alertConditionNames` become the alert summary. Without condition names, Plural uses `message`.

### Associate alerts with Plural resources

Plural keeps an alert only when it belongs to a Plural project, cluster, or service, or when a workbench trigger matches it. Otherwise the notification is acknowledged and ignored.

Plural searches the whole payload for `plrl_project: <name>`, `plrl_cluster: <handle>`, and `plrl_service: <name>`. The service is looked up on that cluster. Each value ends at the next comma or whitespace, so put all three in one string field, such as the `plural` field above, in that order with a comma after each value but the last. A value right before a closing quote, other than `plrl_service`, includes the quote and does not match.

If nothing resolves, Plural looks for markers in the title and summary: `Plural Project: <name>`, `Plural Cluster: <handle>`, and `Plural Service: <name>`, or the forms `plrl-project-<name>`, `plrl-cluster-<handle>`, and `plrl-service-<name>`. A service marker also needs the cluster.

A workbench trigger matches against the alert title and summary, not the raw payload. When several triggers on the webhook match, the one with the highest priority wins.

## Authentication

Plural checks the HTTP Basic auth password against the webhook secret. The username can be any value. A bearer token or a custom header carrying the secret is not accepted, and requests without the right Basic auth password are rejected with 403.

## Limitations

* **Closed issues are dropped unless you map them.** New Relic sends `CLOSED` when an issue closes, and Plural only resolves on `RESOLVED`. Without the mapping below, the alert stays firing in Plural.
* **Two severities.** Only `CRITICAL` is kept as critical. `HIGH`, `MEDIUM`, and `LOW` all become medium.
* **Basic auth only.** Choose Basic Authentication on the destination.

## Set up the webhook

### Create the webhook in Plural

1. In the Plural Console, open **Settings → Webhooks settings** and click **Create webhook**. You can also create one while adding a [webhook trigger](/plural-features/workbenches/automation#webhook-triggers) to a workbench.
2. Set **Type of webhook** to `Observability` and **Provider type** to `New Relic`.
3. Enter a **Name** and enter or generate a **Secret**. Names are unique: creating a webhook with the name of an existing observability webhook updates that webhook.
4. Optionally grant users or groups **Read permissions** and **Write permissions** on the webhook.
5. Click **Create** and copy the **Webhook URL**.

### Create a webhook destination in New Relic

1. In New Relic, open **Alerts → Destinations** and select **Webhook**.
2. Enter a **Webhook name** and set **Endpoint URL** to the Plural webhook URL.
3. Under **Use authorization**, choose **Basic Authentication**, with any non-empty user name and the Plural secret as the password.
4. Save the destination.

### Send notifications from a workflow

1. Open **Alerts → Workflows** and edit a workflow, or add a new one. Filter it to the issues Plural should see, for example by policy or tag.
2. Add a **Webhook** notification that uses the destination you created.
3. Edit the payload as described below.
4. Notify on at least **Activated** and **Closed**.
5. Send a test notification, then save the workflow.

### Send closed issues as resolved

In the workflow's webhook payload, replace the `state` line so a closed issue arrives as `RESOLVED`, and add the association field:

```
"state": {{#eq state "CLOSED"}}"RESOLVED"{{else}}{{json state}}{{/eq}},
"plural": "plrl_project: payments, plrl_cluster: prod-us-east, plrl_service: checkout",
```

Check the **Preview** to confirm the rendered payload is valid JSON.

## Troubleshooting

* **403 Forbidden**: the destination does not use Basic Authentication, or the password does not match the Plural secret.
* **`{"ignored": true}`**: the issue has no project, cluster, or service association and no trigger matched it, or `state` is neither `ACTIVATED` nor `RESOLVED`.
* **Alert never resolves**: the payload still sends `CLOSED`. Map it to `RESOLVED`.
* **Cluster or project not associated**: a `plrl_*` value ran into a closing quote. Add a comma after it, or move it before `plrl_service`.

## Related

* [Webhooks](/plural-features/workbenches/integrations/webhooks)
* [Webhook triggers](/plural-features/workbenches/automation#webhook-triggers)
