---
title: Bitbucket Cloud
description: Receive Bitbucket Cloud issue and pull request events in Plural
---

A Bitbucket Cloud webhook delivers issues, pull requests, and their comments from a Bitbucket Cloud repository into Plural. Each one becomes an issue record in Plural that a workbench can act on.

An event does not start a job by itself. A job starts only when a [webhook trigger](/plural-features/workbenches/automation#webhook-triggers) on a workbench matches the item, and only when the item has just become open: a new open issue, pull request, or comment, or a closed one that was reopened. Edits to an item that is already open do not start another job, and the same item starts at most one job per workbench in an hour.

This webhook is separate from the SCM webhook Plural uses for pull request automation and Flows. See [SCM webhooks and PR linking](/plural-features/flows/scm-webhooks-and-pr-linking) for that one.

## What Plural reads from the payload

Plural looks at the shape of the payload, not the `X-Event-Key` header. Any event that carries a `pullrequest` or `issue` object is recorded. Everything else, such as repository pushes, is acknowledged and ignored.

| Bitbucket event | Recorded as | Title | Body | Link |
|---|---|---|---|---|
| Issue created or updated | The issue | Issue title | `content.raw` | Issue page |
| Issue comment created | A separate item per comment | `Comment on Issue: <title> (#<comment id>)` | Comment `content.raw` | Comment link |
| Pull request created, updated, merged, or declined | The pull request | Pull request title | Description | Pull request page |
| Pull request comment created | A separate item per comment | `Comment on PR: <title> (#<comment id>)` | Comment `content.raw` | Comment link |

Other pull request events, such as approvals, update the pull request's own record.

Plural identifies each item by repository (`repository.full_name`) and Bitbucket ID, so later events for the same issue, pull request, or comment update the existing record instead of creating a new one. An empty body is stored as `{empty}`, and bodies longer than 10,000 characters are truncated.

A trigger matches against the title and body joined by a newline. Because a comment's title includes the pull request or issue title, a trigger that matches text in that title also matches every comment on it.

### Status

| Item | Open | Completed | Cancelled |
|---|---|---|---|
| Pull request | `OPEN` and any other state | `MERGED` | `DECLINED` |
| Issue | `new`, `open`, `on hold`, and any other state | `resolved`, `closed` | `duplicate`, `invalid`, `wontfix` |
| Comment | Follows its pull request or issue | | |

### Pull requests and their comments

When a pull request event arrives, Plural copies the pull request's status to every other Bitbucket item it already tracks for that pull request, such as comment items. Merging the pull request completes them, and declining it cancels them. Issue comments are not updated when their issue changes.

If no trigger matches a pull request event but exactly one workbench already tracks a comment on that pull request, the pull request is attached to that workbench.

## Authentication

When the webhook has a secret, Bitbucket Cloud signs every delivery. Plural reads the `X-Hub-Signature` header, computes an HMAC-SHA256 of the raw request body with the webhook secret, and compares it to the header value `sha256=<hex digest>`. A missing or wrong signature is rejected with 403, so a Bitbucket webhook without a secret cannot deliver to Plural.

Plural does not check timestamps, so a captured request could be replayed.

## Limitations

* **New items need a workbench or flow association.** Plural records a new item only when a workbench trigger matches it, a `Plural Flow: <flow name>` line in the title or body links it to a flow, or it is attached through its pull request as described above. Otherwise it returns `{"ignored": true}` with status 200 and stores nothing. Updates to items Plural already tracks are always applied.
* **Comments are separate items.** Each comment can match a trigger and start its own job, including comments that the agent posts through the [Bitbucket tool](/plural-features/workbenches/integrations/tools/bitbucket). Write triggers that the agent's own comments do not match.
* **No deletes.** A deleted issue or comment is not removed from Plural.

## Set up the webhook

### Create the webhook in Plural

1. In the Plural Console, open **Settings → Webhooks settings** and click **Create webhook**. You can also create one while adding a webhook trigger to a workbench.
2. Set **Type of webhook** to `Ticketing` and **Provider type** to `Bitbucket`.
3. Enter a **Name**, then generate or paste a **Secret**.
4. Optionally restrict who can read or change the webhook under **Read permissions** and **Write permissions**.
5. Click **Create**. Plural shows the **Webhook URL** and **Secret**. Copy both.

### Add the webhook in Bitbucket Cloud

You need admin access to the repository.

1. In the repository, open **Repository settings → Webhooks** (under **Workflow**) and click **Add webhook**.
2. Enter a **Title** and set **URL** to the Plural webhook URL.
3. Set **Secret** to the same secret you entered in Plural. Bitbucket does not show the secret again after you save.
4. Under **Triggers**, select **Choose from a full list of triggers** and select:
   * **Pull Request**: **Created**, **Updated**, **Merged**, **Declined**, and **Comment created**.
   * **Issue**: **Created**, **Updated**, and **Comment created**, if you use the Bitbucket issue tracker.
5. Keep certificate verification enabled and click **Save**.

Then [add a webhook trigger](/plural-features/workbenches/automation#webhook-triggers) on a workbench, open a test pull request or issue whose text matches the trigger, and check the request in the webhook's request history in Bitbucket.

## Troubleshooting

* **403 Forbidden**: the webhook has no secret, or its secret does not match the secret in Plural. If you changed the secret in Plural, update it in Bitbucket too.
* **`{"ignored": true}`**: the event carries no `pullrequest` or `issue` object, no trigger matched a new item, or the webhook URL belongs to a webhook that was deleted in Plural.
* **The item is recorded but no job starts**: the item was already open, so the event was an update rather than a new or reopened item, or the same item already started a job for that workbench in the last hour.

## Related

* [Webhooks](/plural-features/workbenches/integrations/webhooks)
* [Bitbucket tool](/plural-features/workbenches/integrations/tools/bitbucket)
* [Webhook triggers](/plural-features/workbenches/automation#webhook-triggers)
