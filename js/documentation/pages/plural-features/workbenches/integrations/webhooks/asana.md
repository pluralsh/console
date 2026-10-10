---
title: Asana
description: Receive Asana task events in Plural
---

An Asana webhook delivers task lifecycle events from Asana into Plural. After you configure the source once, you can attach it to one or more workbench triggers to start jobs based on task changes.

This guide uses the Plural Console UI. For general webhook behavior and trigger configuration, see [Webhooks](/plural-features/workbenches/integrations/webhooks).

## Prerequisites

Before you begin, make sure you have:

* An Asana workspace with tasks or projects you want to monitor.
* Permission in Plural Console to create a webhook source and configure workbench triggers.
* Access to the Asana API to create webhook subscriptions. Asana webhooks are created programmatically through the Asana API, not through the Asana web UI.

## Capabilities

Asana webhooks deliver task lifecycle events:

* **Task created** — a new task is created in the subscribed resource.
* **Task updated** — task fields such as name, notes, assignee, due date, or custom fields are modified.
* **Task completed** — a task is marked as complete.
* **Task deleted** — a task is removed from the workspace.

Plural accepts both standard Asana webhook event payloads (which include an `events` array with resource identifiers) and enriched payloads that include full task data.

Inbound events are stored as issues in Plural and do not start a job until a workbench trigger matches the payload content. See [Webhook triggers](/plural-features/workbenches/automation#webhook-triggers) for binding events to workbenches.

## Create the Asana webhook source

### 1. Create the source in Plural first

In Plural Console:

1. Open **Workbenches → Integrations**, then click the **Webhooks** tab.
2. Click **Add webhook source**.
3. Set **Type** to **Ticketing**.
4. Set **Provider** to **ASANA**.
5. Enter a descriptive **Name** for the source, such as `asana-incident-tasks`.
6. Enter a **Signing secret**. Use a strong, randomly generated value. You will use this secret to verify webhook signatures from Asana.
7. Click **Create new webhook**.

After creation, Plural displays the webhook URL. Copy this URL; you will use it in the next step.

### 2. Create the webhook subscription in Asana

Asana webhooks are created through the Asana API against your workspace or project resources. See [Create a webhook](https://developers.asana.com/reference/createwebhook) in the Asana API documentation.

Create the webhook with:

* **resource** — the Asana project or task resource GID to monitor. Scope this to incident or ticketing work so Plural receives only relevant lifecycle updates.
* **target** — the Plural webhook URL from step 1.

During webhook creation, Asana sends a handshake request with an `X-Hook-Secret` header. Your endpoint must respond with a `200` or `204` status and echo that header in the response to complete setup. Plural handles this handshake automatically.

### 3. Verify the integration

Create or update a test task in the subscribed Asana resource, then confirm in Plural:

* The webhook request is accepted (check **Workbenches → Webhooks** for delivery status).
* The event payload is parsed and stored as an issue.
* Expected task metadata such as title, URL, and status appears correctly.

## Authentication

Asana signs each webhook event with an HMAC-SHA256 signature, sent in the `x-hook-signature` header. Plural verifies this signature using the signing secret you configured in step 1. Requests with invalid or missing signatures are rejected with a `403` response.

The signing secret you store in Plural is separate from the `X-Hook-Secret` handshake value Asana sends during subscription creation. The handshake proves endpoint ownership once; the signature on each event proves authenticity.

## Troubleshooting

### Webhook creation fails

* Confirm that the Plural webhook URL is reachable over HTTPS from the public internet.
* Verify that the Asana API request includes the correct `resource` GID and `target` URL.
* Check that your Asana account has permission to create webhooks for the target resource.

### Events are not delivered

* Confirm that the Asana webhook subscription is active. Asana expires webhooks if they fail repeatedly.
* Verify that the subscribed resource scope includes the tasks you are creating or updating.
* Check **Workbenches → Webhooks** in Plural for delivery errors or signature verification failures.

### Signature verification fails

* Ensure the **Signing secret** in Plural exactly matches the secret used to compute the `x-hook-signature` header.
* If you rotate the secret, update it in both Plural and any custom Asana webhook tooling.

### No job starts after an event arrives

* Webhook sources do not start jobs by themselves. Add a workbench trigger that matches the task title or body content. See [Webhook triggers](/plural-features/workbenches/automation#webhook-triggers).
* Verify that the trigger's match expression covers the incoming issue payload.

## Related

* [Webhooks](/plural-features/workbenches/integrations/webhooks)
* [Automating workbench jobs](/plural-features/workbenches/automation#webhook-triggers)
