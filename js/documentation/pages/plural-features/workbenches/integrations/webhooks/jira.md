---
title: Jira
description: Receive Jira issue events in Plural
---

A Jira webhook delivers Jira issues into Plural. Each issue becomes an issue record in Plural that a workbench can act on.

You can send issues to Plural in two ways:

* **A Jira admin webhook** (**Settings → System → WebHooks**) configured with the Plural secret. Jira signs each delivery with it. This needs Jira admin rights.
* **A Jira Automation rule** with the **Send web request** action, which sends the Plural secret in a header. Project admins can create one.

An issue event does not start a job by itself. A job starts only when a [webhook trigger](/plural-features/workbenches/automation#webhook-triggers) on a workbench matches the issue, and only when the issue has just become open: a new open issue, or an issue that moved back into a status Plural treats as open. Edits to an issue that is already open do not start another job, and the same issue starts at most one job per workbench in an hour.

## What Plural reads from the payload

Plural reads any JSON body with a top-level `issue` object. It does not look at the event name (`webhookEvent` in admin webhook deliveries), so created, updated, and transitioned issues are handled the same way. A body without `issue` is acknowledged and ignored. Admin webhook issue events and the **Work item data (Jira format)** body of **Send web request** both have this shape:

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

Plural accepts either of two headers:

* `X-Hub-Signature`: the signature Jira admin webhooks send when they have a secret, in the form `sha256=<hex digest>`. Plural computes an HMAC of the raw request body keyed with the webhook secret, using the method named in the header (`sha1`, `sha256`, `sha384`, or `sha512`), and compares it with the digest.
* `X-Atlassian-Webhook-Secret`: the webhook secret itself, sent by an automation rule.

If `X-Hub-Signature` is present it must be valid. Plural does not fall back to `X-Atlassian-Webhook-Secret`. Requests with neither header are rejected with 403, so an admin webhook without a secret is always rejected.

With an automation rule, the secret travels with every request, so use the HTTPS webhook URL, mark the header as hidden in the rule, and rotate the secret if it may have leaked. A signed admin webhook never sends the secret itself. Plural does not check timestamps, so a captured request could be replayed.

## Limitations

* **Admin webhooks need a secret.** An admin webhook without one sends no credentials, and Plural rejects it.
* **Select issue events only.** Comment and worklog events on an admin webhook also include the `issue` object, so Plural records them as issue updates. An `issue_deleted` event updates the record instead of removing it.
* **New issues need a workbench or flow association.** Plural records a new issue only when a workbench trigger matches its summary and description, or a `Plural Flow: <flow name>` line in the summary or description links it to a flow. Otherwise it returns `{"ignored": true}` with status 200 and stores nothing. Updates to issues Plural already tracks are always applied.
* **Every matching change is sent.** The webhook or rule also sends changes the agent makes through the [Jira tool](/plural-features/workbenches/integrations/tools/jira). They update the record but start a job only if the issue becomes open again.
* **No deletes.** A deleted issue is not removed from Plural.

## Set up the webhook

### Create the webhook in Plural

1. In the Plural Console, open **Settings → Webhooks settings** and click **Create webhook**. You can also create one while adding a webhook trigger to a workbench.
2. Set **Type of webhook** to `Ticketing` and **Provider type** to `Jira`.
3. Enter a **Name**, then generate or paste a **Secret**.
4. Optionally restrict who can read or change the webhook under **Read permissions** and **Write permissions**.
5. Click **Create**. Plural shows the **Webhook URL** and **Secret**. Copy both.

Then configure Jira with either an admin webhook or an automation rule.

### Option 1: Create an admin webhook in Jira

You need Jira admin rights.

1. In Jira, open **Settings → System**, then select **WebHooks** and click **Create a WebHook**.
2. Enter a name, and set **URL** to the Plural webhook URL.
3. Set **Secret** to the Plural secret.
4. Under **Events**, select the **Issue** events **created** and **updated**. Optionally add a JQL filter, for example `project = OPS AND labels = plural`.
5. Click **Create**.

Atlassian's [Jira Cloud webhooks](https://developer.atlassian.com/cloud/jira/platform/webhooks/) page describes admin webhooks, JQL filters, and the `X-Hub-Signature` header.

### Option 2: Create an automation rule in Jira

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

Atlassian's [Jira automation actions](https://support.atlassian.com/cloud-automation/docs/jira-automation-actions/) page describes the **Send web request** action and its body formats.

### Test the webhook

[Add a webhook trigger](/plural-features/workbenches/automation#webhook-triggers) on a workbench and create a test issue whose summary or description matches the trigger. For an automation rule, check the rule's **Audit log** in Jira.

## Troubleshooting

* **403 Forbidden from an admin webhook**: the webhook has no secret, or its secret does not match the Plural secret. Jira does not show a saved secret, so edit the webhook and enter the Plural secret again.
* **403 Forbidden from an automation rule**: the request has no `X-Atlassian-Webhook-Secret` header or its value does not match the Plural secret.
* **403 Forbidden after rotating the secret**: update the secret in the admin webhook or the rule to match the new Plural secret.
* **`{"ignored": true}`**: the body has no `issue` object (for example, a **Custom data** body without one), the issue has no summary, no trigger matched a new issue, or the webhook URL belongs to a webhook that was deleted in Plural.
* **Wrong status**: the workflow uses status names Plural does not map. Anything not listed above is treated as open.
* **The issue is recorded but no job starts**: the issue was already open, so the event was an update rather than a new or reopened issue, or the same issue already started a job for that workbench in the last hour.

## Related

* [Webhooks](/plural-features/workbenches/integrations/webhooks)
* [Jira tool](/plural-features/workbenches/integrations/tools/jira)
* [Webhook triggers](/plural-features/workbenches/automation#webhook-triggers)
