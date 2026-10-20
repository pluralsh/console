---
title: Linear
description: Receive Linear issue events in Plural
---

A Linear webhook delivers Linear issues into Plural. Each issue becomes an issue record in Plural that a workbench can act on. Linear generates the signing secret, so you create the webhook in Linear first and paste its secret into Plural.

An issue event does not start a job by itself. A job starts only when a [webhook trigger](/plural-features/workbenches/automation#webhook-triggers) on a workbench matches the issue, and only when the issue has just become open: a new open issue, or an issue that moved back into a state Plural treats as open. Edits to an issue that is already open do not start another job, and the same issue starts at most one job per workbench in an hour.

## What Plural reads from the payload

Plural reads only events with `type` set to `Issue`. Events for comments, projects, cycles, and other models are acknowledged and ignored. Plural does not look at `action`, so `create`, `update`, and `remove` events for an issue are handled the same way.

From the issue in `data`:

* `id` becomes the issue ID. Later events for the same issue update the existing record instead of creating a new one.
* `title` and `description` become the issue title and body. Bodies longer than 10,000 characters are truncated.
* `url` becomes the link back to the issue.
* `state.name` sets the status.

A trigger matches against the title and body joined by a newline.

### Status

State names match exactly, including case, except where both forms are listed. Any other state, such as Triage, Backlog, Todo, or Duplicate, is treated as open.

| Open | In progress | Completed | Cancelled |
|---|---|---|---|
| Any other state | In Progress, In Review | Done, done, Completed, completed | Canceled, Cancelled |

If your team renamed its workflow states, issues in the renamed states show as open.

## Authentication

Linear signs every delivery with the webhook's signing secret. Plural reads the `Linear-Signature` header, computes an HMAC-SHA256 of the raw request body with the secret stored in Plural, and compares it to the header as a lowercase hex digest. A missing or wrong signature is rejected with 403.

Plural does not check the `webhookTimestamp` field, so a captured request could be replayed.

## Limitations

* **Issue events only.** Comments and other models are ignored, so a comment on an issue does not start a job.
* **New issues need a workbench or flow association.** Plural records a new issue only when a workbench trigger matches its title and description, or a `Plural Flow: <flow name>` line in the title or description links it to a flow. Otherwise it returns `{"ignored": true}` with status 200 and stores nothing. Updates to issues Plural already tracks are always applied.
* **Every change is sent.** Linear sends every issue change, including changes made by integrations. They update the record but start a job only if the issue becomes open again.
* **No deletes.** A removed issue is not deleted from Plural. Its status still comes from its state.

## Set up the webhook

You need to be a Linear workspace admin to create webhooks.

### Create the webhook in Linear

1. In Linear, open **Settings → API** and click **New webhook**.
2. Enter a label and a temporary URL. You will replace the URL with the Plural URL later.
3. Choose all public teams or a single team, and under data change events select **Issues**.
4. Save the webhook, open its detail page, and copy the signing secret.

### Create the webhook in Plural

1. In the Plural Console, open **Settings → Webhooks settings** and click **Create webhook**. You can also create one while adding a webhook trigger to a workbench.
2. Set **Type of webhook** to `Ticketing` and **Provider type** to `Linear`.
3. Enter a **Name**, and paste the Linear signing secret into **Secret**. Don't generate a new one.
4. Optionally restrict who can read or change the webhook under **Read permissions** and **Write permissions**.
5. Click **Create**. Plural shows the **Webhook URL**. Copy it.

### Point Linear at Plural

Back in Linear, edit the webhook, replace the temporary URL with the Plural webhook URL, and save.

Then [add a webhook trigger](/plural-features/workbenches/automation#webhook-triggers) on a workbench and create a test issue in the subscribed team whose title or description matches the trigger.

## Troubleshooting

* **403 Forbidden**: the secret in Plural is not the Linear signing secret, for example because a new one was generated in Plural. Edit the webhook in Plural and paste the secret from the Linear webhook's detail page. Linear retries a failed delivery up to three times and may disable a webhook that keeps failing, so check that it is still enabled.
* **`{"ignored": true}`**: the event is not an `Issue` event, the payload has a null `description`, no trigger matched a new issue, or the webhook URL belongs to a webhook that was deleted in Plural.
* **Wrong status**: the team uses state names Plural does not map. Anything not listed above is treated as open.
* **The issue is recorded but no job starts**: the issue was already open, so the event was an update rather than a new or reopened issue, or the same issue already started a job for that workbench in the last hour.

## Related

* [Webhooks](/plural-features/workbenches/integrations/webhooks)
* [Linear tool](/plural-features/workbenches/integrations/tools/linear)
* [Webhook triggers](/plural-features/workbenches/automation#webhook-triggers)
