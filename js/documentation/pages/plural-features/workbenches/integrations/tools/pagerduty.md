---
title: PagerDuty
description: Read PagerDuty incidents from a workbench
---

The PagerDuty tool lets a workbench agent read incidents from the PagerDuty REST API while a job is running. This is separate from a [PagerDuty webhook](/plural-features/workbenches/integrations/webhooks/pagerduty), which delivers alert payloads into Plural so a job can start — the tool lets that job fetch additional incident context the webhook payload didn't include, such as `body.details`, notes, or trigger log entry channel details.

## Prerequisites

Before you begin, make sure you have:

* Permission in Plural Console to create a configured tool and edit the target workbench.
* A PagerDuty REST API key with permission to read incidents for the services the workbench needs.

### Create a REST API key

1. In PagerDuty, go to **Integrations → API Access Keys → Create New API Key**.
2. Enter a description, and choose read-only access if you only need incident lookup.
3. Copy the key immediately — PagerDuty does not show it again.

## Capabilities

* `pagerduty_get_incident` — Get full incident details, including title, status, urgency, priority, service, assignments, and `body.details` (the UI description). Pass the incident ID from a webhook payload or from `pagerduty_list_incidents`.
* `pagerduty_list_incidents` — List incidents, filtered by status, service, or time range. The response includes pagination fields `offset`, `limit`, and `more`; `limit` accepts a value up to 100.
* `pagerduty_list_incident_notes` — List the notes attached to an incident.
* `pagerduty_list_incident_log_entries` — List timeline log entries for an incident. Trigger entries may include channel details with extra context from manual or integration triggers.

Every call authenticates with the configured REST API key, so the agent can only read incidents and services that key's owner is authorized to see.

## Create the PagerDuty tool

1. In Plural Console, open **Workbenches → Integrations**.
2. Find the **PagerDuty** card and click **Add tool**.
3. On the **Configuration** step, paste the REST API key into **API token**.
4. Click **Next**.

### Configure access

On the **Access policy** step, add the users or groups that should have read or write access to this configured tool:

* **Read permissions** control who can access and attach the tool to a workbench.
* **Write permissions** control who can modify the tool configuration and access policy.

Click **Save**. The connection is now available under **Workbenches → Configured Tools**.

## Attach PagerDuty to a workbench

You can attach the tool while creating a workbench or add it to an existing one. See [Workbench tools](/plural-features/workbenches/integrations/tools#attaching-tools-to-a-workbench) for the attachment steps, which are the same for every tool type.

## Using it from a workbench

Open the workbench's **Launch** tab and describe the incident you want the agent to investigate. Try prompts such as:

* `Get PagerDuty incident Q1AB2CD3EF4GH5 and summarize its current status, assignees, and description.`
* `List triggered PagerDuty incidents for the checkout service from the last 2 hours and group them by urgency.`
* `Read the notes and log entries for incident Q1AB2CD3EF4GH5 and summarize the response timeline.`

A workbench that handles PagerDuty alert workflows typically pairs this tool with a [PagerDuty webhook](/plural-features/workbenches/integrations/webhooks/pagerduty) that starts the job from the alert itself.

## Troubleshooting

### Authentication or permission errors

* A `401` response means the API token is missing or invalid — confirm **API token** is set to a current REST API key.
* A `403` response means the key's owner cannot access the requested incident or service — use a key whose owner has read access to the services the workbench needs.

### An incident or service isn't found

* Confirm the incident ID matches what PagerDuty uses — the numeric incident number shown in the UI is different from the incident ID used by the API and received in webhook payloads (`event.data.id`).
* For `pagerduty_list_incidents`, narrow or widen the `statuses`, `service_ids`, or time range filters if results are missing or too broad.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
