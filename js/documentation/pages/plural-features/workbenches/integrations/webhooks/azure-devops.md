---
title: Azure DevOps
description: Receive Azure DevOps work item and pull request events in Plural
---

An Azure DevOps webhook delivers work item, pull request, and PR comment events from Azure DevOps into Plural. After you configure the source once, you can attach it to one or more workbench triggers to start jobs based on work item or code review changes.

This guide uses the Plural Console UI and Azure DevOps service hooks. For general webhook behavior and trigger configuration, see [Webhooks](/plural-features/workbenches/integrations/webhooks).

## Prerequisites

Before you begin, make sure you have:

* An Azure DevOps organization and project with work items or pull requests you want to monitor.
* Permission in your Azure DevOps project to create service hook subscriptions. This typically requires project administrator or collection administrator permissions.
* Permission in Plural Console to create a webhook source and configure workbench triggers.
* An HTTPS-accessible Plural deployment. Azure DevOps webhooks require HTTPS and must reach your endpoint over the public internet (or your network must allow Azure DevOps inbound IP ranges if you use restrictions).

## Capabilities

Azure DevOps webhooks deliver service hook events:

* **Work item created** — a new work item (bug, task, user story, or custom type) is created.
* **Work item updated** — work item fields such as title, description, state, assignee, or custom fields are modified.
* **Work item commented** — a comment is added to a work item.
* **Work item deleted** — a work item is removed.
* **Pull request created, updated, or merged** — a pull request lifecycle event occurs.
* **Pull request comment** — a comment is added to a pull request.

Plural accepts Azure DevOps service hook payloads whose `eventType` begins with `workitem.` (for example `workitem.created`, `workitem.updated`) or that contain `pullRequest` data in the `resource` field. Work items include detailed field information (title, description, repro steps, acceptance criteria, and custom fields). Pull requests include title, description, and status.

Inbound events are stored as issues in Plural and do not start a job until a workbench trigger matches the payload content. See [Webhook triggers](/plural-features/workbenches/automation#webhook-triggers) for binding events to workbenches.

## Create the Azure DevOps webhook source

### 1. Create the source in Plural first

In Plural Console:

1. Open **Workbenches → Integrations**, then click the **Webhooks** tab.
2. Click **Add webhook source**.
3. Set **Type** to **Ticketing**.
4. Set **Provider** to **AZURE_DEVOPS**.
5. Enter a descriptive **Name** for the source, such as `azdo-bugs`.
6. Enter a **Secret**. Use a strong, randomly generated value. This will be used as the HTTP Basic authentication password.
7. Click **Create new webhook**.

After creation, Plural displays the webhook URL. Copy this URL; you will use it in the next step.

### 2. Create the service hook subscription in Azure DevOps

In your Azure DevOps organization, open the target project, then go to **Project settings → Service hooks → Create subscription** (or click **+**).

1. Under **Services**, choose **Web Hooks**, then click **Next**.
2. On the **Trigger** step, select a work item event (for example **Work item updated**). You can create multiple subscriptions for different events if needed. See Microsoft's [Service hooks events](https://learn.microsoft.com/en-us/azure/devops/service-hooks/events?view=azure-devops) documentation for the complete list.
3. On the **Action** step:
   * Set **URL** to the Plural webhook URL from step 1.
   * The URL scheme must be **HTTPS** (required for Basic authentication per Microsoft's documentation).
   * Enable **HTTP Basic authentication**.
   * Set **Password** to the **same secret** you entered in Plural in step 1.
   * You may use any **Username** value. Plural verifies only the password.
4. Under **Resource details to send** (or equivalent), select **All**. This ensures the payload includes work item fields (title, description, state, and so on). **Minimal** or **None** may omit fields Plural uses to build the issue body and metadata.
5. Use **Test** to verify delivery, then click **Finish**.

Repeat this process to subscribe to additional event types (for example **Work item created**, **Pull request created**) as needed. Each subscription delivers one event type to the same Plural webhook URL.

### 3. Verify the integration

Create or update a work item that matches your subscription scope, then confirm in Plural:

* The HTTP request returns success (not `403` from Basic auth mismatch).
* The webhook request is accepted (check **Workbenches → Webhooks** for delivery status).
* Issue rows show the expected title, URL, and body content.

## Authentication

Azure DevOps authenticates service hooks using HTTP Basic authentication. Plural verifies that the **password** in the `Authorization` header matches the secret you configured in step 1. The **username** is ignored. Requests with invalid or missing credentials are rejected with a `403` response.

## Troubleshooting

### Authentication fails (403 responses)

* Confirm that the Basic auth **password** in Azure DevOps exactly matches the **Secret** stored on the Plural webhook source.
* If you rotate the secret, update it in both Plural and the Azure DevOps service hook subscription.

### Events are not delivered

* Verify that the service hook subscription is active. Azure DevOps may disable subscriptions that fail repeatedly.
* Confirm that the Plural webhook URL uses HTTPS and is reachable from Azure DevOps over the public internet.
* Check that the subscription scope and filters match the work items or pull requests you are creating or updating.

### Missing field data in Plural

* Ensure the **Resource details to send** setting in the Azure DevOps service hook is set to **All**, not **Minimal** or **None**.
* Verify that the work item type includes the expected fields. Custom fields appear in the Azure DevOps payload and are included in Plural's issue body template.

### No job starts after an event arrives

* Webhook sources do not start jobs by themselves. Add a workbench trigger that matches the work item title or body content. See [Webhook triggers](/plural-features/workbenches/automation#webhook-triggers).
* Verify that the trigger's match expression covers the incoming issue payload.

## Related

* [Webhooks](/plural-features/workbenches/integrations/webhooks)
* [Automating workbench jobs](/plural-features/workbenches/automation#webhook-triggers)
* [Azure DevOps Service hooks documentation](https://learn.microsoft.com/en-us/azure/devops/service-hooks/services/webhooks?view=azure-devops)
