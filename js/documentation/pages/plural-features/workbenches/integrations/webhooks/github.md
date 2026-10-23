---
title: GitHub
description: Receive GitHub issue and pull request events in Plural
---

A GitHub webhook delivers issues, pull requests, and their comments from GitHub into Plural. Each issue, pull request, or comment becomes an issue record in Plural that a workbench can act on. You can register the webhook on a repository or on an organization.

An event does not start a job by itself. A job starts only when a [webhook trigger](/plural-features/workbenches/automation#webhook-triggers) on a workbench matches the item, and only when the item has just become open: a new open issue, pull request, or comment, or a closed one that was reopened. Edits to an item that is already open do not start another job, and the same item starts at most one job per workbench in an hour.

This webhook is separate from the SCM webhook Plural uses for pull request automation and Flows. See [SCM webhooks and PR linking](/plural-features/flows/scm-webhooks-and-pr-linking) for that one.

## What Plural reads from the payload

Plural looks at the shape of the payload, not the `X-GitHub-Event` header or the `action` field. Any event that carries an `issue` or `pull_request` object is recorded, whatever its action. Everything else, including GitHub's ping, is acknowledged and ignored.

| GitHub event | Recorded as | Title | Body | Link |
|---|---|---|---|---|
| Issues | The issue | Issue title | Issue body | Issue page |
| Pull requests | The pull request | Pull request title | Pull request body | Pull request page |
| Issue comments | A separate item per comment | The issue title, or `Comment on PR: <title> (#<comment id>)` for a pull request comment | Comment body | Issue or pull request page |
| Pull request review comments | A separate item per comment | `Comment on PR: <title> (#<comment id>)` | Comment body | Pull request page |

Other events that include a `pull_request` object, such as pull request reviews, update the pull request's own record.

Plural identifies each item by repository and GitHub ID, so later events for the same issue, pull request, or comment update the existing record instead of creating a new one. The repository comes from `repository.full_name`, or from the item's URL when that field is missing. An empty body is stored as `{empty}`, and bodies longer than 10,000 characters are truncated.

A trigger matches against the title and body joined by a newline. Because a comment's title includes the pull request title, a trigger that matches text in a pull request title also matches every comment on that pull request.

### Status

| Item | Open | Completed | Cancelled |
|---|---|---|---|
| Issue | `open` | `closed` with reason `completed` or no reason | `closed` with reason `not_planned` |
| Pull request | `open` | Merged | Closed without merging |
| Comment | Follows its issue or pull request | | |

### Pull requests and their comments

When a pull request event arrives, Plural copies the pull request's status to every other GitHub item it already tracks for that pull request, such as comment items. Merging the pull request completes them, closing it cancels them, and reopening it reopens them. A reopen starts at most one job per workbench.

If no trigger matches a pull request event but exactly one workbench already tracks a comment on that pull request, the pull request is attached to that workbench.

## Authentication

GitHub signs every delivery with the webhook secret. Plural reads the `X-Hub-Signature-256` header, computes an HMAC-SHA256 of the raw request body with the secret, and compares it to the header value `sha256=<hex digest>`. A missing or wrong signature is rejected with 403. The older SHA-1 `X-Hub-Signature` header is not accepted.

Plural does not check delivery IDs or timestamps, so a captured request could be replayed.

## Limitations

* **JSON only.** Set the content type to `application/json`. A form-encoded delivery passes the signature check but is ignored.
* **New items need a workbench or flow association.** Plural records a new item only when a workbench trigger matches it, a `Plural Flow: <flow name>` line in the title or body links it to a flow, or it is attached through its pull request as described above. Otherwise it returns `{"ignored": true}` with status 200 and stores nothing. Updates to items Plural already tracks are always applied.
* **Comments are separate items.** Each comment can match a trigger and start its own job, including comments that the agent posts through the [GitHub tool](/plural-features/workbenches/integrations/tools/github). Write triggers that the agent's own comments do not match.
* **No deletes.** A deleted issue or comment is not removed from Plural.

## Set up the webhook

### Create the webhook in Plural

1. In the Plural Console, open **Settings → Webhooks settings** and click **Create webhook**. You can also create one while adding a webhook trigger to a workbench.
2. Set **Type of webhook** to `Ticketing` and **Provider type** to `GitHub`.
3. Enter a **Name**, then generate or paste a **Secret**.
4. Optionally restrict who can read or change the webhook under **Read permissions** and **Write permissions**.
5. Click **Create**. Plural shows the **Webhook URL** and **Secret**. Copy both.

### Add the webhook in GitHub

1. In the repository or organization, open **Settings → Webhooks** and click **Add webhook**.
2. Set **Payload URL** to the Plural webhook URL.
3. Set **Content type** to `application/json`.
4. Set **Secret** to the same secret you entered in Plural.
5. Keep SSL verification enabled.
6. Under **Which events would you like to trigger this webhook?**, choose **Let me select individual events** and select **Issues**, **Issue comments**, **Pull requests**, and **Pull request review comments**. Leave out events you don't need. Avoid **Send me everything**.
7. Keep **Active** checked and click **Add webhook**.

GitHub sends a ping when you save. Plural accepts and ignores it. Then [add a webhook trigger](/plural-features/workbenches/automation#webhook-triggers) on a workbench, open a test issue or pull request whose text matches the trigger, and check the delivery under **Recent Deliveries**.

## Troubleshooting

* **403 Forbidden**: the **Secret** in GitHub does not match the secret in Plural, or the webhook has no secret. If you changed the secret in Plural, update it in GitHub too.
* **`{"ignored": true}` on the ping**: expected. The ping carries no issue or pull request.
* **`{"ignored": true}` on a real event**: the content type is not `application/json`, the event has no `issue` or `pull_request` object, no trigger matched a new item, or the webhook URL belongs to a webhook that was deleted in Plural.
* **The item is recorded but no job starts**: the item was already open, so the event was an update rather than a new or reopened item, or the same item already started a job for that workbench in the last hour.

## Related

* [Webhooks](/plural-features/workbenches/integrations/webhooks)
* [GitHub tool](/plural-features/workbenches/integrations/tools/github)
* [Webhook triggers](/plural-features/workbenches/automation#webhook-triggers)
