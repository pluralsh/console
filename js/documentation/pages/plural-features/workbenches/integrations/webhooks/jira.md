---
title: Jira
description: Receive Jira issue events in Plural
---

A Jira webhook delivers issue lifecycle events from Jira into Plural. After you configure the source once, you can attach it to one or more workbench triggers to start jobs based on issue changes.

This guide uses the Plural Console UI and Jira webhook management. For general webhook behavior and trigger configuration, see [Webhooks](/plural-features/workbenches/integrations/webhooks).

## Prerequisites

Before you begin, make sure you have:

* A Jira site (Jira Cloud, Jira Server, or Jira Data Center) with issues you want to monitor.
* Jira administrator permissions to create and manage webhooks in your Jira site.
* Permission in Plural Console to create a webhook source and configure workbench triggers.
* An HTTPS-accessible Plural deployment. Deliver the webhook over HTTPS to protect the signing secret in transit.

## Capabilities

Jira webhooks deliver issue lifecycle events:

* **Issue created** — a new issue is created in the project.
* **Issue updated** — issue fields such as summary, description, status, assignee, priority, or custom fields are modified.
* **Issue transitioned** — the issue moves to a different workflow state.
* **Issue resolved** — the issue is marked as resolved or fixed.
* **Issue reopened** — a resolved or closed issue is reopened.
* **Issue deleted** — an issue is removed from the project.

Plural accepts Jira webhook payloads that include an `issue` key. The integration supports both Jira Server/Data Center (plain text descriptions) and Jira Cloud (Atlassian Document Format descriptions). Status mapping recognizes common workflow states: `Done`, `Closed`, and `Resolved` map to completed; `Cancelled`, `Rejected`, `Won't Do`, and `Won't Fix` map to cancelled; `In Progress` maps to in progress; all others default to open.

Inbound events are stored as issues in Plural and do not start a job until a workbench trigger matches the payload content. See [Webhook triggers](/plural-features/workbenches/automation#webhook-triggers) for binding events to workbenches.

## Create the Jira webhook source

### 1. Create the source in Plural first

In Plural Console:

1. Open **Workbenches → Integrations**, then click the **Webhooks** tab.
2. Click **Add webhook source**.
3. Set **Type** to **Ticketing**.
4. Set **Provider** to **JIRA**.
5. Enter a descriptive **Name** for the source, such as `jira-incidents`.
6. Enter a **Signing secret**. Use a strong, randomly generated value. You will include this in the webhook verification header.
7. Click **Create new webhook**.

After creation, Plural displays the webhook URL. Copy this URL; you will use it in the next step.

### 2. Create the webhook in Jira

As a Jira administrator, open your Jira site and navigate to webhook management:

* **Jira Cloud**: Go to **Settings → System → WebHooks** (under **Advanced**).
* **Jira Server/Data Center**: Go to **Administration → System → WebHooks**.

Then:

1. Click **Create a WebHook**.
2. Set **Name** to something descriptive, such as `Plural incident webhook`.
3. Set **URL** to the Plural webhook URL from step 1.
4. Under **Events**, select the issue lifecycle events you want to receive:
   * **issue created**
   * **issue updated**
   * **issue transitioned**
   * **issue resolved/reopened**

   You can also select **all issues** to receive all issue events, but filtering with JQL (next step) is recommended to limit scope.

5. (Optional) Use the **JQL** filter to scope the webhook to specific projects, issue types, or labels. For example, `project = INCIDENT AND issuetype = Bug` limits events to bugs in the INCIDENT project. Scoping the webhook reduces noise and ensures Plural receives only relevant issue updates.
6. Save the webhook.

### 3. Verify the integration

Create or update a test issue in Jira that matches your JQL scope, then confirm in Plural:

* The webhook request is accepted (check **Workbenches → Webhooks** for delivery status).
* The event payload is parsed and stored as an issue.
* Expected issue metadata such as summary, description, URL, and status appears correctly.

## Authentication

{% callout severity="warning" %}
Jira admin webhooks do not support a configurable shared-secret field. Plural verifies requests using the `x-atlassian-webhook-secret` header, which you must add externally (for example, via a reverse proxy or API gateway). Without this header verification, rely on HTTPS, restrictive JQL scoping, and network-level access controls to secure the webhook.
{% /callout %}

Plural checks that the `x-atlassian-webhook-secret` header matches the signing secret you configured in step 1. Requests with invalid or missing headers are rejected with a `403` response. If your Jira deployment does not support adding custom headers to webhook requests, ensure the Plural webhook URL is protected by HTTPS and is not publicly discoverable.

Use JQL filters to limit the scope of delivered events to incident or ticketing work so Plural receives only relevant issue lifecycle updates.

## Troubleshooting

### Events are not delivered

* Confirm that the Jira webhook is active. Jira may disable webhooks that fail repeatedly.
* Verify that the Plural webhook URL uses HTTPS and is reachable from your Jira site.
* Check that the JQL filter (if configured) matches the issues you are creating or updating.
* Review Jira's webhook audit log (if available) for delivery errors or endpoint failures.

### Authentication fails (403 responses)

* Confirm that the `x-atlassian-webhook-secret` header is present in requests and matches the **Signing secret** stored in Plural.
* If you are using a reverse proxy or API gateway to add this header, verify that it is correctly configured for the Plural webhook URL path.

### Missing field data in Plural

* Ensure your Jira webhook is configured to send all issue data, not just event metadata.
* For custom fields, verify that they are included in the webhook payload. Custom field data appears in the issue body template.
* Jira Cloud uses Atlassian Document Format (ADF) for rich text fields. Plural extracts plain text from ADF; complex formatting is not preserved.

### No job starts after an event arrives

* Webhook sources do not start jobs by themselves. Add a workbench trigger that matches the issue summary or description content. See [Webhook triggers](/plural-features/workbenches/automation#webhook-triggers).
* Verify that the trigger's match expression covers the incoming issue payload.

## Related

* [Webhooks](/plural-features/workbenches/integrations/webhooks)
* [Automating workbench jobs](/plural-features/workbenches/automation#webhook-triggers)
* [Atlassian - Managing webhooks](https://confluence.atlassian.com/adminjiracloud/managing-webhooks-776636231.html)
* [Atlassian Developer - Jira webhooks](https://developer.atlassian.com/cloud/jira/platform/webhooks/)
