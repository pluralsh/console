---
title: Bitbucket Data Center
description: Receive Bitbucket Data Center pull request events in Plural
---

A Bitbucket Data Center webhook delivers pull requests and pull request comments from Bitbucket Data Center into Plural. Each pull request or comment becomes an issue record in Plural that a workbench can act on. You can register the webhook on a project, where every repository inherits it, or on a single repository.

An event does not start a job by itself. A job starts only when a [webhook trigger](/plural-features/workbenches/automation#webhook-triggers) on a workbench matches the item, and only when the item has just become open, such as a newly opened pull request or a new comment on an open one. Edits to an item that is already open do not start another job, and the same item starts at most one job per workbench in an hour.

This webhook is separate from the SCM webhook Plural uses for pull request automation and Flows. See [SCM webhooks and PR linking](/plural-features/flows/scm-webhooks-and-pr-linking) for that one.

## What Plural reads from the payload

Plural looks at the shape of the payload, not the `eventKey`. Any event that carries a `pullRequest` object is recorded. Repository events, such as pushes and commit comments, are acknowledged and ignored.

| Bitbucket event | Recorded as | Title | Body | Link |
|---|---|---|---|---|
| Pull request opened, modified, merged, declined, and other pull request events | The pull request | Pull request title | Description | The pull request's `links.self` URL |
| Pull request comment added, edited, or deleted | A separate item per comment | `Comment on PR: <title> (#<comment id>)` | Comment `text` | Pull request URL with `#comment-<id>` |

Plural identifies each item by project key, repository slug (taken from the pull request's `toRef`), and pull request or comment ID, so later events for the same pull request or comment update the existing record instead of creating a new one. An empty body is stored as `{empty}`, and bodies longer than 10,000 characters are truncated.

A trigger matches against the title and body joined by a newline. Because a comment's title includes the pull request title, a trigger that matches text in a pull request title also matches every comment on that pull request.

### Status

| Item | Open | Completed | Cancelled |
|---|---|---|---|
| Pull request | `OPEN` and any other state | `MERGED` | `DECLINED`, `SUPERSEDED` |
| Comment | Follows its pull request | | |

### Pull requests and their comments

When a pull request event arrives, Plural copies the pull request's status to every other Bitbucket Data Center item it already tracks for that pull request, such as comment items. Merging the pull request completes them, and declining it cancels them.

If no trigger matches a pull request event but exactly one workbench already tracks a comment on that pull request, the pull request is attached to that workbench.

## Authentication

Plural authenticates Bitbucket Data Center with HTTP Basic authentication. The password must equal the webhook secret, and the username is ignored. A request without Basic credentials, or with the wrong password, is rejected with 403.

Bitbucket Data Center can also secure a webhook with a secret token that signs the body in an `X-Hub-Signature` header. Plural does not check that header for this provider, so a webhook secured only with a secret token is rejected. Choose Basic authentication.

The password travels with every request, so use HTTPS and rotate the secret if it may have leaked. Plural does not check timestamps, so a captured request could be replayed.

## Limitations

* **Pull requests only.** Repository events, including commit comments, are ignored.
* **New items need a workbench or flow association.** Plural records a new item only when a workbench trigger matches it, a `Plural Flow: <flow name>` line in the title or body links it to a flow, or it is attached through its pull request as described above. Otherwise it returns `{"ignored": true}` with status 200 and stores nothing. Updates to items Plural already tracks are always applied.
* **Comments are separate items.** Each comment can match a trigger and start its own job, including comments that the agent posts through the [Bitbucket Data Center tool](/plural-features/workbenches/integrations/tools/bitbucket-datacenter). Write triggers that the agent's own comments do not match.
* **No deletes.** A deleted pull request or comment is not removed from Plural. A comment-deleted event updates the comment's record instead.

## Set up the webhook

### Create the webhook in Plural

1. In the Plural Console, open **Settings → Webhooks settings** and click **Create webhook**. You can also create one while adding a webhook trigger to a workbench.
2. Set **Type of webhook** to `Ticketing` and **Provider type** to `Bitbucket Data Center`.
3. Enter a **Name**, then generate or paste a **Secret**. This is the Basic authentication password.
4. Optionally restrict who can read or change the webhook under **Read permissions** and **Write permissions**.
5. Click **Create**. Plural shows the **Webhook URL** and **Secret**. Copy both.

### Add the webhook in Bitbucket Data Center

You need admin access to the project or repository.

1. Open **Project settings → Webhooks** or **Repository settings → Webhooks** and click **Create webhook**.
2. Enter a **Title** and set the **URL** to the Plural webhook URL.
3. Choose **Basic authentication** as the authentication method. Enter any username, and set the password to the same secret you entered in Plural.
4. Keep SSL/TLS certificate verification enabled.
5. Under the pull request events, select **Opened**, **Modified**, **Merged**, **Declined**, **Comment added**, and **Comment edited**. Clear **Repository push** unless another integration needs it.
6. Keep the webhook **Active** and click **Create**.

Then [add a webhook trigger](/plural-features/workbenches/automation#webhook-triggers) on a workbench, open a test pull request whose text matches the trigger, and check the request in the webhook's event log (**View details** on the Webhooks page).

## Troubleshooting

* **403 Forbidden**: the webhook uses a secret token or no authentication instead of Basic authentication, or the Basic auth password does not match the secret in Plural. If you changed the secret in Plural, update the password in Bitbucket too.
* **`{"ignored": true}`**: the event carries no `pullRequest` object (for example, a push), no trigger matched a new item, or the webhook URL belongs to a webhook that was deleted in Plural.
* **The item is recorded but no job starts**: the item was already open, so the event was an update rather than a newly opened item, or the same item already started a job for that workbench in the last hour.
* **Bitbucket stops sending**: Bitbucket Data Center skips a webhook for a while after repeated failures. Fix the cause, such as a wrong password, and deliveries resume.

## Related

* [Webhooks](/plural-features/workbenches/integrations/webhooks)
* [Bitbucket Data Center tool](/plural-features/workbenches/integrations/tools/bitbucket-datacenter)
* [Webhook triggers](/plural-features/workbenches/automation#webhook-triggers)
