---
title: Azure DevOps
description: Receive Azure DevOps work item and pull request comment events in Plural
---

An Azure DevOps webhook delivers work items and pull request comments from Azure DevOps into Plural through a **Web Hooks** service hook subscription. Each work item or comment becomes an issue record in Plural that a workbench can act on. Azure DevOps authenticates each delivery with HTTP Basic authentication, using the Plural secret as the password.

An event does not start a job by itself. A job starts only when a [webhook trigger](/plural-features/workbenches/automation#webhook-triggers) on a workbench matches the item, and only when the item has just become open: a new open work item or comment, or a work item that moved back into a state Plural treats as open. Edits to an item that is already open do not start another job, and the same item starts at most one job per workbench in an hour.

## What Plural reads from the payload

Plural looks at the service hook envelope's `eventType` and `resource`:

* **Work item events.** Any `eventType` that starts with `workitem.`, such as `workitem.created`, `workitem.updated`, `workitem.commented`, `workitem.deleted`, or `workitem.restored`, is read as the work item in `resource`.
* **Pull request comment events.** The **Pull request commented on** event (`ms.vss-code.git-pullrequest-comment-event`) is read as a separate item for each comment.

Every other event is acknowledged and ignored. That includes code pushes and the pull request created, updated, and merged events, whose `resource` is the pull request itself.

| Event | Title | Body | Link |
|---|---|---|---|
| Work item | `System.Title` | The work item fields described below | `resource._links.html.href`, or `resource.url` when there is no HTML link |
| Pull request comment | `Comment on PR: <pull request title> (#<comment id>)` | Comment text | The comment's HTML link, or the pull request URL |

A work item's body is built from its fields under Markdown headings: **Description** (`System.Description`), then **Repro steps**, **Acceptance criteria**, **System info**, **Found in build**, and **Resolved reason** when those fields are present. Values are stored as Azure DevOps sends them, which is often HTML. Bodies longer than 10,000 characters are truncated.

Plural identifies a work item by its project ID (`resourceContainers.project.id`) and `resource.id`, so later events for the same work item update the existing record instead of creating a new one.

A trigger matches against the title and body joined by a newline. Because a comment's title includes the pull request title, a trigger that matches text in a pull request title also matches every comment on that pull request.

### Status

A work item's status comes from `System.State`. Names match exactly, including case. Any other state, such as New, To Do, or Proposed, is treated as open.

| Open | In progress | Completed | Cancelled |
|---|---|---|---|
| Any other state | Active, Committed, In Progress, Resolved, Testing, Review, Design, Approved | Closed, Done, Completed, Complete | Removed |

Resolved counts as in progress, not completed. A pull request comment follows the pull request's `status` in the event: `active` is open, `completed` is completed, and `abandoned` is cancelled.

## Authentication

Plural reads the HTTP Basic `Authorization` header and compares the password with the webhook secret. The username is ignored. A missing header or a wrong password is rejected with 403.

Basic authentication sends the secret with every request, so use an HTTPS URL. Azure DevOps requires HTTPS for Basic authentication on a webhook.

Plural does not check timestamps, so a captured request could be replayed.

## Limitations

* **Send all resource details.** Plural builds the title, body, and status from `resource.fields`. Set **Resource details to send** to **All**. With **Minimal**, the body has no description and the status is always open. With **None**, the event is ignored.
* **New items need a workbench or flow association.** Plural records a new work item or comment only when a workbench trigger matches it, or a `Plural Flow: <flow name>` line in the title or body links it to a flow. Otherwise it returns `{"ignored": true}` with status 200 and stores nothing. Updates to items Plural already tracks are always applied.
* **Comments are separate items.** Each pull request comment can match a trigger and start its own job, including comments that the agent posts through the [Azure DevOps tool](/plural-features/workbenches/integrations/tools/azure-devops). Write triggers that the agent's own comments do not match.
* **No deletes.** A deleted work item is not removed from Plural, and Plural does not mark it cancelled. Its status still comes from `System.State`.

## Set up the webhook

### Create the webhook in Plural

1. In the Plural Console, open **Settings → Webhooks settings** and click **Create webhook**. You can also create one while adding a webhook trigger to a workbench.
2. Set **Type of webhook** to `Ticketing` and **Provider type** to `Azure DevOps`.
3. Enter a **Name**, then generate or paste a **Secret**. This is the password Azure DevOps will send.
4. Optionally restrict who can read or change the webhook under **Read permissions** and **Write permissions**.
5. Click **Create**. Plural shows the **Webhook URL** and **Secret**. Copy both.

### Create the service hook in Azure DevOps

You need to be a member of the **Project Administrators** or **Project Collection Administrators** group.

1. In your Azure DevOps project, open **Project settings → Service hooks** and click **Create subscription** (or **+**).
2. Select **Web Hooks**, then **Next**.
3. On **Trigger**, pick a work item event, such as **Work item created** or **Work item updated**, and optionally filter by area path, work item type, or tag. Then click **Next**. Create one subscription per event type you want, and one for **Pull request commented on** if you want pull request comments.
4. On **Action**:
   * Set **URL** to the Plural webhook URL.
   * Enter any **Basic authentication username**, and set **Basic authentication password** to the Plural secret.
   * Keep **Resource details to send** set to **All**.
5. Click **Test** to check delivery, then **Finish**.

Azure DevOps can't deliver to `localhost` or private address ranges. If your Plural instance sits behind an allowlist, allow Azure DevOps [inbound IP ranges](https://learn.microsoft.com/en-us/azure/devops/organizations/security/allow-list-ip-url?view=azure-devops).

Then [add a webhook trigger](/plural-features/workbenches/automation#webhook-triggers) on a workbench, create a test work item whose title or description matches the trigger, and check the subscription's history in **Service hooks**.

## Troubleshooting

* **403 Forbidden**: the Basic authentication password does not match the Plural secret, or the subscription has no Basic authentication. If you changed the secret in Plural, update it in Azure DevOps too.
* **`{"ignored": true}`**: the event is not a work item or pull request comment event, **Resource details to send** is **None**, the work item has no title, no trigger matched a new item, or the webhook URL belongs to a webhook that was deleted in Plural.
* **Wrong status**: the process uses custom state names. Only the state names listed above are mapped. Anything else is treated as open.
* **The item is recorded but no job starts**: the item was already open, so the event was an update rather than a new or reopened item, or the same item already started a job for that workbench in the last hour.

## Related

* [Webhooks](/plural-features/workbenches/integrations/webhooks)
* [Azure DevOps tool](/plural-features/workbenches/integrations/tools/azure-devops)
* [Webhook triggers](/plural-features/workbenches/automation#webhook-triggers)
