---
title: Asana
description: Receive Asana task events in Plural
---

An Asana webhook delivers Asana tasks into Plural. Each task becomes an issue record in Plural that a workbench can act on.

Plural does not answer Asana's webhook handshake, so you can't point Asana's webhooks API straight at the Plural URL. Instead, you send tasks from your own integration, such as a small relay service that receives Asana's webhooks and forwards each task to Plural with a signature. The rest of this page describes what that integration must send.

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

Compact events carry no task name or notes, so a trigger can only match the placeholder title. They also can't mark a task completed. Fetch the task from the Asana API and send the full `task` payload instead.

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

Plural reads the `X-Hook-Signature` header, computes an HMAC-SHA256 of the raw request body with the webhook secret, and compares it to the header as a lowercase hex digest. A missing or wrong signature is rejected with 403.

This is the same header Asana uses, but the key is different. Asana signs its deliveries with an `X-Hook-Secret` that it generates during the handshake. Plural checks against the secret you stored in Plural. Your integration must sign each request it forwards with the Plural secret.

Plural does not check timestamps, so a captured request could be replayed.

## Limitations

* **No Asana handshake.** When you create a webhook, Asana first sends a handshake request with an `X-Hook-Secret` header and expects the same header echoed back. Plural does not echo it, and the handshake carries no `X-Hook-Signature`, so Plural answers 403 and Asana does not create the webhook. Let your own integration complete the handshake.
* **Signed JSON only.** Each request must be JSON, and the signature must cover exactly the bytes you send.
* **New tasks need a workbench or flow association.** Plural records a new task only when a workbench trigger matches its title and body, or a `Plural Flow: <flow name>` line in the title or body links it to a flow. Otherwise it returns `{"ignored": true}` with status 200 and stores nothing. Updates to tasks Plural already tracks are always applied.
* **No deletes.** A deleted task is not removed from Plural. A compact `deleted` event only marks it cancelled.

## Set up the webhook

### Create the webhook in Plural

1. In the Plural Console, open **Settings → Webhooks settings** and click **Create webhook**. You can also create one while adding a webhook trigger to a workbench.
2. Set **Type of webhook** to `Ticketing` and **Provider type** to `Asana`.
3. Enter a **Name**, then generate or paste a **Secret**.
4. Optionally restrict who can read or change the webhook under **Read permissions** and **Write permissions**.
5. Click **Create**. Plural shows the **Webhook URL** and **Secret**. Copy both.

### Forward tasks from Asana

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

## Troubleshooting

* **Asana can't create the webhook**: the `target` is the Plural URL. Plural does not answer the handshake. Point Asana at your integration instead.
* **403 Forbidden**: the request has no `X-Hook-Signature`, it was signed with Asana's `X-Hook-Secret` instead of the Plural secret, or the body was changed after signing.
* **`{"ignored": true}`**: the payload has neither a `task` object nor a non-empty `events` list, the task has no `name` or `permalink_url`, no trigger matched a new task, or the webhook URL belongs to a webhook that was deleted in Plural.
* **The title is `Asana Task <gid>`**: your integration forwarded a compact event. Fetch the task and send the full `task` payload.
* **The task is recorded but no job starts**: the task was already open, so the payload was an update rather than a new or reopened task, or the same task already started a job for that workbench in the last hour.

## Related

* [Webhooks](/plural-features/workbenches/integrations/webhooks)
* [Webhook triggers](/plural-features/workbenches/automation#webhook-triggers)
