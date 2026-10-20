---
title: Jira
description: Receive Jira issue events in Plural
---

A Jira webhook delivers Jira issues into Plural. Each issue becomes an issue record in Plural that a workbench can act on.

Plural authenticates each request with an `X-Atlassian-Webhook-Secret` header that carries the webhook secret. Jira's built-in admin webhooks can't send custom headers, so you send issues from a Jira Automation rule with the **Send web request** action, which can.

An issue event does not start a job by itself. A job starts only when a [webhook trigger](/plural-features/workbenches/automation#webhook-triggers) on a workbench matches the issue, and only when the issue has just become open: a new open issue, or an issue that moved back into a status Plural treats as open. Edits to an issue that is already open do not start another job, and the same issue starts at most one job per workbench in an hour.

## What Plural reads from the payload

Plural reads any JSON body with a top-level `issue` object. It does not look at the event name, so created, updated, and transitioned issues are handled the same way. A body without `issue` is acknowledged and ignored. The **Work item data (Jira format)** body of **Send web request** has this shape:

```json
{
  "issue": {
    "self": "https://example.atlassian.net/rest/api/2/issue/10001",
    "key": "OPS-42",
    "fields": {
      "summary": "Checkout is down",
      "description": "500s from the payments service",
      "status": { "name": "In Progress" }
    }
  }
}
```

* `key` becomes the issue ID. Later events for the same key update the existing record instead of creating a new one.
* `fields.summary` and `fields.description` become the issue title and body. A plain-text description is used as is. An Atlassian Document Format description from Jira Cloud is flattened to its text, one line per paragraph. An empty description is stored as `{empty}`, and bodies longer than 10,000 characters are truncated.
* The link is built from the site in `self` and the key, for example `https://example.atlassian.net/browse/OPS-42`.
* `fields.status.name` sets the status.

`key`, `self`, and `fields.summary` are required. An issue without them is not recorded.

A trigger matches against the title and body joined by a newline.

### Status

Plural lowercases the status name and drops spaces and punctuation before mapping it, so `In Progress`, `in-progress`, and `INPROGRESS` all count as in progress, and `Won't Do` matches `wontdo`. Any other status is treated as open.

| Open | In progress | Completed | Cancelled |
|---|---|---|---|
| Any other status, such as To Do, Open, Backlog, or In Review | In Progress | Done, Closed, Resolved | Cancelled, Canceled, Rejected, Won't Do, Won't Fix |

A custom status such as In Review counts as open, so moving an issue into it from In Progress makes it open again and can start another job.

## Authentication

Plural compares the `X-Atlassian-Webhook-Secret` header with the webhook secret. A missing or wrong header is rejected with 403.

Plural does not check Jira's `X-Hub-Signature` header. A Jira admin webhook, with or without a secret, does not send `X-Atlassian-Webhook-Secret`, so every delivery from one is rejected.

The secret travels with every request, so use the HTTPS webhook URL, mark the header as hidden in the automation rule, and rotate the secret if it may have leaked. Plural does not check timestamps, so a captured request could be replayed.

## Limitations

* **Use Jira Automation, not admin webhooks.** Admin webhooks can't add the header Plural requires.
* **New issues need a workbench or flow association.** Plural records a new issue only when a workbench trigger matches its summary and description, or a `Plural Flow: <flow name>` line in the summary or description links it to a flow. Otherwise it returns `{"ignored": true}` with status 200 and stores nothing. Updates to issues Plural already tracks are always applied.
* **Every matching change is sent.** The rule also sends changes the agent makes through the [Jira tool](/plural-features/workbenches/integrations/tools/jira). They update the record but start a job only if the issue becomes open again.
* **No deletes.** A deleted issue is not removed from Plural.

## Set up the webhook

### Create the webhook in Plural

1. In the Plural Console, open **Settings → Webhooks settings** and click **Create webhook**. You can also create one while adding a webhook trigger to a workbench.
2. Set **Type of webhook** to `Ticketing` and **Provider type** to `Jira`.
3. Enter a **Name**, then generate or paste a **Secret**.
4. Optionally restrict who can read or change the webhook under **Read permissions** and **Write permissions**.
5. Click **Create**. Plural shows the **Webhook URL** and **Secret**. Copy both.

### Create an automation rule in Jira

You need permission to manage automation rules in the project, or Jira admin rights for a global rule.

1. In the Jira project, open **Project settings → Automation** and create a rule.
2. Add a trigger. **Work item created** and **Work item transitioned** cover new issues and status changes.
3. Optionally add a **JQL condition** so the rule only sends the issues you want, for example `project = OPS AND labels = plural`.
4. Add the **Send web request** action:
   * Set **Web request URL** to the Plural webhook URL.
   * Set **HTTP method** to `POST`.
   * Set **Web request body** to **Work item data (Jira format)**.
   * Under **Headers**, add `Content-Type` with value `application/json`, and `X-Atlassian-Webhook-Secret` with the Plural secret as its value. Check **Hidden** for the secret.
5. Name the rule and turn it on.

Then [add a webhook trigger](/plural-features/workbenches/automation#webhook-triggers) on a workbench, create a test issue whose summary or description matches the trigger, and check the rule's **Audit log** in Jira.

Atlassian's [Jira automation actions](https://support.atlassian.com/cloud-automation/docs/jira-automation-actions/) page describes the **Send web request** action and its body formats.

## Troubleshooting

* **403 Forbidden**: the request has no `X-Atlassian-Webhook-Secret` header or its value does not match the Plural secret. Admin webhooks always get 403. If you changed the secret in Plural, update the header in the rule too.
* **`{"ignored": true}`**: the body has no `issue` object (for example, a **Custom data** body without one), the issue has no summary, no trigger matched a new issue, or the webhook URL belongs to a webhook that was deleted in Plural.
* **Wrong status**: the workflow uses status names Plural does not map. Anything not listed above is treated as open.
* **The issue is recorded but no job starts**: the issue was already open, so the event was an update rather than a new or reopened issue, or the same issue already started a job for that workbench in the last hour.

## Related

* [Webhooks](/plural-features/workbenches/integrations/webhooks)
* [Jira tool](/plural-features/workbenches/integrations/tools/jira)
* [Webhook triggers](/plural-features/workbenches/automation#webhook-triggers)
