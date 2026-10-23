---
title: GitLab
description: Receive GitLab issue and merge request events in Plural
---

A GitLab webhook delivers issues, work items, merge requests, and merge request comments from GitLab into Plural. Each one becomes an issue record in Plural that a workbench can act on. You can register the webhook on a project or on a group.

An event does not start a job by itself. A job starts only when a [webhook trigger](/plural-features/workbenches/automation#webhook-triggers) on a workbench matches the item, and only when the item has just become open: a new open issue, merge request, or comment, or a closed one that was reopened. Edits to an item that is already open do not start another job, and the same item starts at most one job per workbench in an hour.

This webhook is separate from the SCM webhook Plural uses for pull request automation and Flows. See [SCM webhooks and PR linking](/plural-features/flows/scm-webhooks-and-pr-linking) for that one.

## What Plural reads from the payload

Plural picks the event from the payload's `object_kind`. It accepts four kinds and acknowledges and ignores everything else, including comments on issues, commits, and snippets.

| `object_kind` | Recorded as | Title | Body | Link |
|---|---|---|---|---|
| `issue` | The issue | Issue title | Description | `url` |
| `work_item` | The work item, such as a task, epic, or incident | Work item title | Description | `url` |
| `merge_request` | The merge request | Merge request title | Description | `url` |
| `note` on a merge request | A separate item per comment | `Comment on MR: <title> (#<note id>)` | Comment text | Comment URL |

GitLab sends ordinary issues and Service Desk issues as `issue` and other work item types as `work_item`. Title, description, `iid`, and state come from `object_attributes`, falling back to the current value in `changes` when a field is missing.

Plural identifies each item by project path (`project.path_with_namespace`) and `iid`, or by note ID for comments, so later events for the same item update the existing record instead of creating a new one. An empty description is stored as `{empty}`, and bodies longer than 10,000 characters are truncated.

A trigger matches against the title and body joined by a newline. Because a comment's title includes the merge request title, a trigger that matches text in a merge request title also matches every comment on that merge request.

### Status

| Item | Open | Completed | Cancelled |
|---|---|---|---|
| Issue or work item | `opened`, `reopened` | `closed` | |
| Merge request | `opened` and any other state | `merged` | `closed` |
| Merge request comment | Merge request in any state except `closed`, including `merged` | Merge request `closed` | |

Plural also reads an issue's `action`: an issue with action `close` is completed even when its `state` is missing or still reads open.

### Merge requests and their comments

When a merge request event arrives, Plural copies the merge request's status to every other GitLab item it already tracks for that merge request, such as comment items. Merging the merge request completes them, closing it cancels them, and reopening it reopens them. A reopen starts at most one job per workbench.

If no trigger matches a merge request event but exactly one workbench already tracks a comment on that merge request, the merge request is attached to that workbench.

## Authentication

GitLab sends the webhook's secret token in the `X-Gitlab-Token` header. Plural compares it with the webhook secret and rejects a missing or wrong token with 403.

The token travels with every request, so keep SSL verification enabled and rotate the secret if it may have leaked. Plural does not check timestamps, so a captured request could be replayed.

## Limitations

* **Merge request comments only.** Comments on issues, commits, and snippets are ignored. Put the text you want a trigger to match in the issue's title or description.
* **New items need a workbench or flow association.** Plural records a new item only when a workbench trigger matches it, a `Plural Flow: <flow name>` line in the title or body links it to a flow, or it is attached through its merge request as described above. Otherwise it returns `{"ignored": true}` with status 200 and stores nothing. Updates to items Plural already tracks are always applied.
* **Comments are separate items.** Each comment can match a trigger and start its own job, including comments that the agent posts through the [GitLab tool](/plural-features/workbenches/integrations/tools/gitlab). Write triggers that the agent's own comments do not match.
* **Closed issues are always completed.** Plural maps every closed issue or work item to completed, never cancelled.
* **No deletes.** A deleted issue or comment is not removed from Plural.

## Set up the webhook

### Create the webhook in Plural

1. In the Plural Console, open **Settings → Webhooks settings** and click **Create webhook**. You can also create one while adding a webhook trigger to a workbench.
2. Set **Type of webhook** to `Ticketing` and **Provider type** to `GitLab`.
3. Enter a **Name**, then generate or paste a **Secret**.
4. Optionally restrict who can read or change the webhook under **Read permissions** and **Write permissions**.
5. Click **Create**. Plural shows the **Webhook URL** and **Secret**. Copy both.

### Add the webhook in GitLab

1. In the project (or group), open **Settings → Webhooks** and click **Add new webhook**.
2. Set **URL** to the Plural webhook URL.
3. Set **Secret token** to the same secret you entered in Plural.
4. Under **Trigger**, select the events you need:
   * **Work item events** (called **Issues events** on older GitLab versions) for issues and other work items.
   * **Merge request events** for merge requests.
   * **Comments** for merge request comments.
   * The confidential variants if you also want confidential issues or comments.
5. Keep **Enable SSL verification** checked and save the webhook.

Then [add a webhook trigger](/plural-features/workbenches/automation#webhook-triggers) on a workbench, open a test issue or merge request whose text matches the trigger, and check the request in the webhook's recent events in GitLab. GitLab's **Test** button sends a sample of an existing item, which Plural records only if it matches a trigger.

## Troubleshooting

* **403 Forbidden**: the **Secret token** in GitLab does not match the secret in Plural, or it is empty. If you changed the secret in Plural, update it in GitLab too.
* **`{"ignored": true}`**: the event kind is not one of the four above (for example, a push, a pipeline, or a comment on an issue), no trigger matched a new item, or the webhook URL belongs to a webhook that was deleted in Plural.
* **The item is recorded but no job starts**: the item was already open, so the event was an update rather than a new or reopened item, or the same item already started a job for that workbench in the last hour.

## Related

* [Webhooks](/plural-features/workbenches/integrations/webhooks)
* [GitLab tool](/plural-features/workbenches/integrations/tools/gitlab)
* [Webhook triggers](/plural-features/workbenches/automation#webhook-triggers)
