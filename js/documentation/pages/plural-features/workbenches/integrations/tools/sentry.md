---
title: Sentry
description: Read Sentry issues and events from a workbench
---

Use the Sentry integration to give a workbench read-only access to issues, events, and stack traces from your Sentry account. Configure the connection once, then attach it to workbenches that need to investigate errors during incident response or debugging workflows.

This integration calls the Sentry API with a configured auth token. It is separate from a [Sentry webhook](/plural-features/workbenches/integrations/webhooks/sentry), which delivers events into Plural so a job can start.

## Prerequisites

Before you begin, make sure you have:

* A Sentry account (SaaS or self-hosted) that is receiving the error events you want the workbench to query.
* Permission in Plural Console to create a configured tool and edit the target workbench.
* A Sentry auth token with `event:read` and `project:read` scopes. See [Create a Sentry auth token](#create-a-sentry-auth-token).
* For self-hosted Sentry, the base URL of your Sentry instance.
* An existing workbench, or permission to create one. See [Setting up a workbench](/plural-features/workbenches/configuration).

### Create a Sentry auth token

In Sentry:

1. Open **Settings → Developer Settings → Auth Tokens** or **Settings → Developer Settings → Custom Integrations** to create an internal integration.
2. Create a token for a dedicated integration user or internal integration.
3. Grant access to the organizations and projects this workbench tool should query.
4. Copy and store the token immediately. Sentry may not display it again.

### Sentry permissions

Assign the auth token these scopes:

| Scope | What the workbench can query |
|---|---|
| `event:read` | List and search issues; read issue details and events including stack traces |
| `project:read` | Read individual project events by event ID |

Do not grant write, admin, or release scopes unless you explicitly need them for other integrations. The workbench tool is read-only and does not require write access.

## Capabilities

The Sentry tool is read-only. It cannot create, modify, resolve, or assign issues.

The workbench agent can call these operations:

* **sentry_list_issues** — Lists or searches issues (unresolved errors) using Sentry query syntax. Supports filters for project, environment, sort order, and stats period. Returns paginated results with a `cursor` for fetching additional pages. Use `issue_id` from results with other operations to retrieve details or stack traces. Calls [`GET /api/0/organizations/{org}/issues/`](https://docs.sentry.io/api/events/list-an-organizations-issues/).
* **sentry_issue_read** — Retrieves issue details including title, status, event counts, and project slug. Does not include stack traces. Use **sentry_get_latest_issue_event** or **sentry_list_issue_events** for stack traces. Calls [`GET /api/0/organizations/{org}/issues/{issue_id}/`](https://docs.sentry.io/api/events/retrieve-an-issue/).
* **sentry_list_issue_events** — Lists error events for a specific issue. Set `full=true` to include stack traces in the response. Use `event_id` from results with **sentry_event_read** to retrieve a specific occurrence. Supports pagination with `cursor`. Calls [`GET /api/0/organizations/{org}/issues/{issue_id}/events/`](https://docs.sentry.io/api/events/list-an-issues-events/).
* **sentry_get_latest_issue_event** — Fetches the latest error event for an issue, with its stack trace. Defaults to `full=true` to include the complete stack trace. Prefer this over listing all events when debugging the current failure. Calls [`GET /api/0/organizations/{org}/issues/{issue_id}/events/latest/`](https://docs.sentry.io/api/events/list-an-issues-events/).
* **sentry_event_read** — Reads a specific event by project slug and event ID. Returns full event JSON including stack trace. Use this when you have an exact event ID from **sentry_list_issue_events** or a webhook payload. Calls [`GET /api/0/projects/{org}/{project}/events/{event_id}/`](https://docs.sentry.io/api/events/retrieve-an-event-for-a-project/).

All operations require the organization slug, which is the URL-safe identifier for your Sentry organization (visible in your Sentry URLs as `sentry.io/organizations/{org-slug}/`).

## Create the Sentry tool

1. In Plural Console, open **Workbenches → Integrations**.
2. Find the **Sentry** card and click **Add tool**.

### Configure the connection

On the **Configuration** step, enter:

* **Name** — a recognizable name for the connection, such as `sentry-production`.
* **URL** — leave blank for Sentry SaaS (`https://sentry.io`), or enter your self-hosted Sentry base URL without a trailing slash.
* **Access token** — the Sentry auth token created in [Create a Sentry auth token](#create-a-sentry-auth-token) with `event:read` and `project:read` scopes.

Click **Next**.

{% callout severity="warning" %}
Treat the access token as a secret. Plural stores it encrypted and does not display it after saving. Never include credential values in screenshots, workbench prompts, or job output.
{% /callout %}

### Configure access

On the **Access policy** step, add the users or groups that should have read or write access to this configured tool:

* **Read permissions** control who can access and attach the tool to a workbench.
* **Write permissions** control who can modify the tool configuration and access policy.

Click **Save**. After the creation confirmation appears, the connection is available under **Workbenches → Configured Tools**.

## Attach Sentry to a workbench

You can attach the tool while creating a workbench or add it to an existing one.

### New workbench

On the final **Attach tools** step of the workbench wizard:

1. Click **Add tools**.
2. Select the Sentry connection by its configured name.
3. Complete the wizard by clicking **Create workbench**.

### Existing workbench

1. Open the workbench.
2. In the left sidebar, find **Tools** and click **Add tools**. You can also open the overflow menu and select **Tools**.
3. In **Add or remove tool from workbench**, select the Sentry connection.
4. Click **Save**.

The configured Sentry tool now appears in the workbench's **Tools** section.

## Query Sentry from a workbench

Open the workbench's **Launch** tab and describe the investigation in the prompt box. Include the organization slug, issue or event identifiers, search criteria, or filters. The workbench chooses the appropriate Sentry operation.

Try prompts such as:

* **List recent issues:** `Using Sentry, list all unresolved issues in organization acme-corp from the last 24 hours and group them by project.`
* **Search for errors:** `Search Sentry for issues containing "database timeout" in organization acme-corp and return the top 10 by event count.`
* **Get issue details:** `Read Sentry issue 4829374658 in organization acme-corp and summarize the title, status, and project.`
* **Fetch stack trace:** `Get the latest error event with stack trace for Sentry issue 4829374658 in organization acme-corp.`
* **Analyze specific event:** `Read Sentry event a1b2c3d4e5f6 from project backend in organization acme-corp and analyze the stack trace.`
* **Webhook enrichment:** `The webhook payload includes Sentry issue id 4829374658. Fetch the latest event with stack trace and identify the root cause.`

Use Sentry query syntax when you need precise filtering. For example, include `is:unresolved level:error` or `environment:production` directly in a **sentry_list_issues** prompt.

Submit the job and watch its activity stream. To verify the integration, confirm that the job completes, open its Sentry tool activity, and check that the call succeeded and returned the expected data. A tool activity entry can also contain an API error, so its presence alone does not verify the connection. For more about job output, see [Running workbench jobs](/plural-features/workbenches/running-jobs).

## Query behavior and limits

Keep these behaviors in mind when querying Sentry:

* All operations are read-only. The tool cannot create, modify, resolve, assign, or delete issues.
* **sentry_list_issues** returns paginated results. Use the `cursor` parameter to fetch additional pages. The default limit is 25 results; you can increase it up to 100 per page.
* Stack traces are only included when you use **sentry_get_latest_issue_event**, **sentry_list_issue_events** with `full=true`, or **sentry_event_read**.
* The organization slug is required for all operations. Find it in your Sentry URLs (for example, `sentry.io/organizations/acme-corp/` uses slug `acme-corp`).
* Project identifiers can be numeric IDs or slugs depending on the operation. Use project slugs from **sentry_issue_read** results with **sentry_event_read**.
* Sentry query syntax supports filters such as `is:unresolved`, `is:assigned`, `level:error`, and `environment:production`. See [Sentry search syntax](https://docs.sentry.io/product/sentry-basics/search/) for details.

## Troubleshooting

### Authentication or permission errors

* Confirm that the access token is valid and has not been revoked or expired in Sentry.
* Verify that the token has `event:read` and `project:read` scopes.
* For a `403` response, check that the token owner has access to the organization and projects you are querying.
* Confirm that the **URL** matches your Sentry instance. Leave it blank for Sentry SaaS or enter your self-hosted base URL without a trailing slash.
* To rotate a token, open **Workbenches → Configured Tools**, select **Edit configuration**, and enter the replacement token. Existing token values are never displayed.

### Organization or project not found

* Verify that the organization slug is correct. Check your Sentry URLs for the exact slug (for example, `sentry.io/organizations/acme-corp/` uses `acme-corp`).
* Confirm that the auth token has access to the specified organization and projects.
* For self-hosted Sentry, ensure the **URL** field points to the correct base URL.

### No stack traces in results

* Remember that **sentry_issue_read** and **sentry_list_issues** do not include stack traces.
* Use **sentry_get_latest_issue_event** to fetch the latest event with stack trace for an issue.
* For **sentry_list_issue_events**, set `full=true` to include stack traces in the response.
* Use **sentry_event_read** with an exact event ID to retrieve a specific event's stack trace.

### Empty or incomplete results

* When listing issues, check your query filters for constraints that might exclude expected results (for example, `is:unresolved`, `environment:production`).
* Remember that **sentry_list_issues** and **sentry_list_issue_events** return paginated results. Use the `cursor` parameter to retrieve additional pages.
* Verify in Sentry that the expected issues and events exist for the same query and filters.
* Confirm that the required scope (`event:read` or `project:read`) is granted to the auth token.

### The Sentry tool is unavailable

* Confirm that the tool appears under **Workbenches → Configured Tools**.
* Verify that your user or group has read access to the configured tool.
* Reopen the workbench's **Tools** dialog and confirm that the Sentry connection is selected.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
* [Sentry webhook](/plural-features/workbenches/integrations/webhooks/sentry)
* [Running workbench jobs](/plural-features/workbenches/running-jobs)
