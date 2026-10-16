---
title: PagerDuty
description: Read PagerDuty incidents from a workbench
---

Use the PagerDuty integration to give a workbench read-only access to incidents, notes, and log entries from your PagerDuty account. Configure the connection once, then attach it to workbenches that need to retrieve incident context during alert workflows.

This integration calls the PagerDuty REST API with a configured API key. It is separate from a [PagerDuty webhook](/plural-features/workbenches/integrations/webhooks/pagerduty), which delivers alert payloads into Plural so a job can start.

## Prerequisites

Before you begin, make sure you have:

* A PagerDuty account with access to the incidents you want the workbench to query.
* Permission in Plural Console to create a configured tool and edit the target workbench.
* A PagerDuty REST API key with read access to the required incidents. See [Create a REST API key](#create-a-rest-api-key).
* An existing workbench, or permission to create one. See [Setting up a workbench](/plural-features/workbenches/configuration).

### Create a REST API key

1. In PagerDuty, go to **Integrations → API Access Keys → Create New API Key**.
2. Enter a description such as `plural-workbench-readonly`.
3. Choose **Read-only** if you only need incident lookup and do not require write operations.
4. Copy the key immediately. PagerDuty will not show it again.

The key needs permission to read incidents for the services the workbench will query. A read-only user API key or account key is typically sufficient.

## Capabilities

The PagerDuty tool is read-only. It cannot create, modify, acknowledge, or resolve incidents.

The workbench agent can call these operations:

* **pagerduty_get_incident** — Retrieves full incident details including title, status, urgency, priority, service, assignments, and `body.details` (the UI description). Accepts an incident ID from webhook payloads or the numeric incident number shown in the PagerDuty UI. Calls [`GET /incidents/{id}`](https://developer.pagerduty.com/api-reference/367602b1c2e48-get-an-incident).
* **pagerduty_list_incidents** — Lists or filters open and recent incidents. Supports filters for status, service, incident key, and time range. Returns paginated results with `offset`, `limit`, and `more` fields. Calls [`GET /incidents`](https://developer.pagerduty.com/api-reference/9d0b0b12e36f9-list-incidents).
* **pagerduty_list_incident_notes** — Lists responder notes attached to an incident. Calls [`GET /incidents/{id}/notes`](https://developer.pagerduty.com/api-reference/988fd8460f5f0-list-notes-for-an-incident).
* **pagerduty_list_incident_log_entries** — Lists timeline log entries for an incident. Trigger entries may include `channel.details` with extra context from manual or integration triggers. Supports time range filtering and pagination. Calls [`GET /incidents/{id}/log_entries`](https://developer.pagerduty.com/api-reference/3679cad205ac9-list-log-entries-for-an-incident).

## Create the PagerDuty tool

1. In Plural Console, open **Workbenches → Integrations**.
2. Find the **PagerDuty** card and click **Add tool**.

### Configure the connection

On the **Configuration** step, enter:

* **Name** — a recognizable name for the connection, such as `pagerduty-production`.
* **API token** — the PagerDuty REST API key created in [Create a REST API key](#create-a-rest-api-key).

Click **Next**.

{% callout severity="warning" %}
Treat the API token as a secret. Plural stores it encrypted and does not display it after saving. Never include credential values in screenshots, workbench prompts, or job output.
{% /callout %}

### Configure access

On the **Access policy** step, add the users or groups that should have read or write access to this configured tool:

* **Read permissions** control who can access and attach the tool to a workbench.
* **Write permissions** control who can modify the tool configuration and access policy.

Click **Save**. After the creation confirmation appears, the connection is available under **Workbenches → Configured Tools**.

## Attach PagerDuty to a workbench

You can attach the tool while creating a workbench or add it to an existing one.

### New workbench

On the final **Attach tools** step of the workbench wizard:

1. Click **Add tools**.
2. Select the PagerDuty connection by its configured name.
3. Complete the wizard by clicking **Create workbench**.

### Existing workbench

1. Open the workbench.
2. In the left sidebar, find **Tools** and click **Add tools**. You can also open the overflow menu and select **Tools**.
3. In **Add or remove tool from workbench**, select the PagerDuty connection.
4. Click **Save**.

The configured PagerDuty tool now appears in the workbench's **Tools** section.

## Query PagerDuty from a workbench

Open the workbench's **Launch** tab and describe what you need in the prompt box. Include the incident identifier, filters, or search criteria. The workbench chooses the appropriate PagerDuty operation.

Try prompts such as:

* **Get incident details:** `Using PagerDuty, get full details for incident P7XMKL including the description and all assignments.`
* **List recent incidents:** `List all triggered PagerDuty incidents from the last 24 hours and group them by service.`
* **Read incident notes:** `Fetch all responder notes for PagerDuty incident 4298765 and summarize the investigation timeline.`
* **Analyze log entries:** `Get the log entries for incident P7XMKL and identify which integration triggered it. Include any channel details.`
* **Webhook enrichment:** `The webhook payload includes incident id P7XMKL. Fetch the full incident record from PagerDuty, read the body.details field, and check for recent notes.`

When referencing an incident, use the incident ID from a webhook payload (such as `event.data.id`) or the numeric incident number shown in the PagerDuty UI. Both formats are accepted.

Submit the job and watch its activity stream. To verify the integration, confirm that the job completes, open its PagerDuty tool activity, and check that the call succeeded and returned the expected data. A tool activity entry can also contain an API error, so its presence alone does not verify the connection. For more about job output, see [Running workbench jobs](/plural-features/workbenches/running-jobs).

## Query behavior and limits

Keep these behaviors in mind when querying PagerDuty:

* All operations are read-only. The tool cannot acknowledge, resolve, reassign, or modify incidents.
* **pagerduty_list_incidents** returns paginated results. Use the `limit` and `offset` parameters for controlled pagination. The response includes a `more` field indicating whether additional results are available.
* Incident list queries include related objects such as services, teams, priorities, and first trigger log entries by default.
* Log entry queries support the `is_overview` flag to return only timeline overview entries.
* Time range filters use ISO 8601 format (`YYYY-MM-DDTHH:MM:SSZ`).

## Troubleshooting

### Authentication errors

* Confirm that the API token is valid and has not been revoked in PagerDuty.
* Verify that the token has read access to the services and incidents you are querying.
* To rotate a key, open **Workbenches → Configured Tools**, select **Edit configuration**, and enter the replacement token. Existing token values are never displayed.

### Incident not found

* Check that the incident ID or number is correct. Webhook payloads use the incident ID (such as `P7XMKL`), while the PagerDuty UI displays the numeric incident number.
* Verify that the API key has permission to access the incident's service.
* Confirm that the incident exists and has not been deleted.

### Empty or incomplete results

* When listing incidents, check your filters for status, service, or time range constraints that might exclude expected results.
* Remember that **pagerduty_list_incidents** returns paginated results. Use the `more` field and `offset` parameter to retrieve additional pages.
* For log entries, verify that the incident has the expected timeline events and that your time range or `is_overview` filter is not excluding them.

### The PagerDuty tool is unavailable

* Confirm that the tool appears under **Workbenches → Configured Tools**.
* Verify that your user or group has read access to the configured tool.
* Reopen the workbench's **Tools** dialog and confirm that the PagerDuty connection is selected.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
* [PagerDuty webhook](/plural-features/workbenches/integrations/webhooks/pagerduty)
* [Running workbench jobs](/plural-features/workbenches/running-jobs)
