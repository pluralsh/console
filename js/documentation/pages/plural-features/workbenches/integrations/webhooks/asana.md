---
title: Asana
description: Receive Asana task events in Plural
---

An Asana webhook delivers Asana tasks into Plural. Each task becomes an issue record in Plural that a workbench can act on.

You can deliver tasks in two ways:

* **Through a relay (recommended).** Your own integration receives Asana's webhooks, fetches each task from the Asana API, and forwards the full task to Plural. Plural then sees the task's name, notes, and completion state, so triggers can match on them.
* **Directly from Asana.** Point an Asana webhook at the Plural URL. Plural answers Asana's handshake and verifies Asana's signatures, but Asana's events carry only the task ID, so every task is recorded with a placeholder title. See [Direct delivery](#direct-delivery-from-asana) for what that allows.

A task does not start a job by itself. A job starts only when a [webhook trigger](/plural-features/workbenches/automation#webhook-triggers) on a workbench matches the task, and only when the task has just become open: a new open task, or a completed task that was marked incomplete again. Edits to a task that is already open do not start another job, and the same task starts at most one job per workbench in an hour.

## What Plural reads from the payload

Plural accepts two payload shapes. Send the full task whenever you can:

```json
{
  "task": {
    "gid": "1209876543210",
    "name": "Checkout is down",
    "notes": "500s from the payments service",
    "permalink_url": "https://app.asana.com/0/1201234567890/1209876543210",
    "completed": false
  }
}
```

* `gid` becomes the issue ID. Later payloads with the same `gid` update the existing record instead of creating a new one.
* `name` and `notes` become the issue title and body. Missing notes are stored as `{empty}`, and bodies longer than 10,000 characters are truncated.
* `permalink_url` becomes the link back to the task.
* `completed` sets the status: `true` is completed, and `false` or missing is open.

`gid`, `name`, and `permalink_url` are required. A task without them is not recorded.

Plural also accepts Asana's own compact event format, `{"events": [...]}`. It reads only the first event in the list:

* `resource.gid` becomes the issue ID.
* For a `task` resource, the title is `Asana Task <gid>` and the link is `https://app.asana.com/0/0/<gid>`. The body is always `{webhook event}`.
* An event with action `deleted` marks the issue cancelled. Every other action marks it open.
* When the first event is about another resource type, such as a story, the payload is ignored.

Compact events carry no task name or notes, so a trigger can only match the placeholder title. They also can't mark a task completed. Fetch the task from the Asana API and send the full `task` payload instead. Compact events are what Asana sends when it delivers directly to Plural.

A payload with neither a `task` object nor a non-empty `events` list, such as Asana's empty heartbeat, is acknowledged and ignored.

A trigger matches against the title and body joined by a newline.

### Status

| `task.completed` | Compact event action | Status |
|---|---|---|
| `false` or missing | anything except `deleted` | Open |
| `true` | | Completed |
| | `deleted` | Cancelled |

Plural never marks an Asana task as in progress.

## Authentication

Plural reads the `X-Hook-Signature` header, computes an HMAC-SHA256 of the raw request body, and compares it to the header as a lowercase hex digest. It accepts a signature made with either of two keys:

* **The webhook secret** you stored in Plural. A relay signs each request it forwards with this secret.
* **Asana's handshake secret.** When an Asana webhook is created with the Plural URL as its target, Asana sends a handshake request carrying an `X-Hook-Secret` header. Plural stores that value, echoes it back in the response, and from then on accepts Asana deliveries signed with it.

A missing or wrong signature is rejected with 403.

Asana's handshake carries no credentials, so Plural trusts only the first one. Once a handshake secret is stored, later handshakes to the same URL are rejected with 403 and the stored value is kept. To connect a new Asana webhook, for example after deleting the old one in Asana, rotate the webhook's secret in Plural first. Changing the secret clears the stored handshake secret, so the next handshake is accepted. Keep the webhook URL private until the handshake has completed.

Plural does not check timestamps, so a captured request could be replayed.

## Limitations

* **One Asana webhook per Plural URL.** Only the first handshake is accepted until you rotate the Plural secret.
* **Signed JSON only.** Each request must be JSON, and the signature must cover exactly the bytes you send.
* **Direct deliveries use placeholder titles.** Asana's own events carry only the task ID, and Plural does not fetch the task from Asana. Each task is titled `Asana Task <gid>` with the body `{webhook event}`, and only the first event in each delivery is read.
* **New tasks need a workbench or flow association.** Plural records a new task only when a workbench trigger matches its title and body, or a `Plural Flow: <flow name>` line in the title or body links it to a flow. Otherwise it returns `{"ignored": true}` with status 200 and stores nothing. Updates to tasks Plural already tracks are always applied.
* **No deletes.** A deleted task is not removed from Plural. A compact `deleted` event only marks it cancelled.

## Set up the webhook

### Create the webhook in Plural

1. In the Plural Console, open **Settings → Webhooks settings** and click **Create webhook**. You can also create one while adding a webhook trigger to a workbench.
2. Set **Type of webhook** to `Ticketing` and **Provider type** to `Asana`.
3. Enter a **Name**, then generate or paste a **Secret**.
4. Optionally restrict who can read or change the webhook under **Read permissions** and **Write permissions**.
5. Click **Create**. Plural shows the **Webhook URL** and **Secret**. Copy both.

### Forward tasks through a relay

Run an integration that Asana can reach over HTTPS, and keep the Plural webhook URL and secret in its configuration.

1. Create an Asana webhook with the Asana API, using your integration's URL as the `target` and the project you want to watch as the `resource`. Scope it to the tasks Plural should see. Asana's [webhooks guide](https://developers.asana.com/docs/webhooks-guide) explains the handshake your integration must answer, how to verify Asana's own `X-Hook-Signature`, and the heartbeats it must acknowledge with 200.
2. For each task event, fetch the task from the Asana API with at least the `name`, `notes`, `permalink_url`, and `completed` fields.
3. Post the task to the Plural webhook URL as `{"task": {...}}`, with `Content-Type: application/json` and an `X-Hook-Signature` header computed with the Plural secret.

For example, from a shell:

```bash
BODY='{"task":{"gid":"1209876543210","name":"Checkout is down","notes":"500s from the payments service","permalink_url":"https://app.asana.com/0/1201234567890/1209876543210","completed":false}}'
SIGNATURE=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$PLURAL_WEBHOOK_SECRET" -hex | sed 's/^.* //')

curl -X POST "$PLURAL_WEBHOOK_URL" \
  -H 'Content-Type: application/json' \
  -H "X-Hook-Signature: $SIGNATURE" \
  -d "$BODY"
```

Then [add a webhook trigger](/plural-features/workbenches/automation#webhook-triggers) on a workbench and send a test task whose name or notes match the trigger. A recorded task returns `{"ignored": false, "message": "persisted issue"}`.

### Direct delivery from Asana

Use direct delivery when you only need to know that a task in a project changed, not what it says. Because every task arrives as `Asana Task <gid>` with the body `{webhook event}`, a trigger that should start jobs from direct deliveries has to match that placeholder text, which means it matches every task from the project.

Create the Asana webhook with the [Asana webhooks API](https://developers.asana.com/reference/createwebhook), using the Plural webhook URL as the `target`, a project as the `resource`, and a personal access token that can see that project:

```bash
curl -X POST https://app.asana.com/api/1.0/webhooks \
  -H "Authorization: Bearer $ASANA_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"data": {"resource": "<project gid>", "target": "<Plural webhook URL>", "filters": [{"resource_type": "task"}]}}'
```

The task filter keeps story and comment events out. Plural reads only the first event in each delivery, and a story event in that position is ignored.

During the request, Asana sends the handshake to Plural. Plural stores Asana's secret and echoes it back, and Asana returns the new webhook. After that, Asana's deliveries and heartbeats are verified with the stored secret.

## Troubleshooting

* **Asana can't create the webhook, and Plural answers the handshake with 403**: a handshake secret is already stored for this webhook. Rotate the webhook's secret in Plural, then create the Asana webhook again.
* **403 Forbidden on a delivery**: the request has no `X-Hook-Signature`, a relay signed it with something other than the Plural secret, or the body was changed after signing. For direct deliveries, check that the Asana webhook is the one that completed the handshake. Rotating the Plural secret also clears the stored handshake secret, so an existing Asana webhook stops being accepted.
* **`{"ignored": true}`**: the payload has neither a `task` object nor a non-empty `events` list, the task has no `name` or `permalink_url`, no trigger matched a new task, or the webhook URL belongs to a webhook that was deleted in Plural.
* **The title is `Asana Task <gid>`**: the task arrived as a compact event, either through direct delivery or because your integration forwarded the event unchanged. Use a relay that fetches the task and sends the full `task` payload.
* **The task is recorded but no job starts**: the task was already open, so the payload was an update rather than a new or reopened task, or the same task already started a job for that workbench in the last hour.

## Related

* [Webhooks](/plural-features/workbenches/integrations/webhooks)
* [Webhook triggers](/plural-features/workbenches/automation#webhook-triggers)
