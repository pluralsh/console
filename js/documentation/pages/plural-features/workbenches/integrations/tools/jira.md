---
title: Jira Cloud
description: Read and update Jira Cloud issues from a workbench
---

The Jira Cloud tool lets a workbench agent work with Jira Cloud issues using a dedicated Atlassian account. Configure it with an API token, then attach it to the workbenches that should use it.

This guide uses the Plural Console UI. For the complete list of integrations and general tool behavior, see [Workbench tools](/plural-features/workbenches/integrations/tools).

## Prerequisites

Before you begin, make sure you have:

* A Jira Cloud instance at `https://<your-site>.atlassian.net`.
* Permission in Plural Console to create a configured tool and edit the target workbench.
* A dedicated Atlassian account for the integration, with only the Jira project permissions the workbench needs.
* An API token for that account. See [Create an API token](#create-an-api-token) below.
* An existing workbench, or permission to create one. See [Setting up a workbench](/plural-features/workbenches/configuration).

## Capabilities

The agent can call these operations on the configured Jira Cloud instance:

* **`jira_list_issues`** — Search Jira issues with JQL (Jira Query Language). Returns paginated results with a cursor for fetching additional pages. Supports field selection to limit the response size.
* **`jira_get_issue`** — Get a single Jira issue by key or ID. Supports field selection and expansion of related data such as changelog or rendered fields.
* **`jira_save_issue`** — Create a new issue or update an existing one. Requires project key, issue type, and summary for creation. Updates apply only the fields provided in the request.
* **`jira_list_comments`** — List comments on an issue. Returns paginated results with a cursor for fetching additional pages.
* **`jira_save_comment`** — Create a new comment or update an existing one on an issue. Supports visibility restrictions (role or group).
* **`jira_list_transitions`** — List the workflow transitions available for an issue based on its current status and the account's permissions.
* **`jira_transition_issue`** — Transition an issue through its workflow. Can optionally set fields or add updates as part of the transition.

All operations use the [Jira REST API v2](https://developer.atlassian.com/cloud/jira/platform/rest/v2/intro/) with HTTP Basic authentication (email + API token).

## Create an API token

1. Sign in to Atlassian as the integration account.
2. Open the [API token management page](https://id.atlassian.com/manage-profile/security/api-tokens).
3. Click **Create API token**.
4. Enter a descriptive label, such as `Plural Workbench`, and click **Create**.
5. Copy the token value immediately. It is displayed only once.

{% callout severity="warning" %}
Use a dedicated integration account, not a personal account. This makes it easier to audit activity, rotate credentials, and scope permissions independently.
{% /callout %}

## Recommended permissions

Grant the integration account only the Jira project permissions required for the operations you plan to enable. A typical read-write workbench needs:

* **Browse Projects** — required for all operations.
* **View Issues** — required to search, get, and list comments.
* **Create Issues** — required to create new issues.
* **Edit Issues** — required to update issue fields.
* **Add Comments** — required to create or update comments.
* **Transition Issues** — required to move issues through workflows.

Do not grant **Administer Jira** or project-level **Administer Projects** unless explicitly required. For read-only workbenches, grant only **Browse Projects** and **View Issues**.

Permissions are enforced by Jira when the agent calls the API. The workbench does not validate permissions upfront — calls that exceed the account's permissions will fail at runtime with a `403` or `404` error.

## Create the Jira Cloud tool

1. In Plural Console, open **Workbenches → Integrations**.
2. Find the **Jira Cloud** card and click **Add tool**.

### Configure the connection

On the **Configuration** step, enter:

* **Name** — a recognizable name for the connection, such as `jira-production`.
* **Jira Cloud URL** — the site URL, such as `https://example.atlassian.net`. Include the protocol and hostname, but not a trailing `/rest/api/2` path.
* **Email** — the integration account's Atlassian email address.
* **API token** — the API token created above.

Click **Next**.

{% callout severity="warning" %}
Treat the API token as a secret. Plural stores it encrypted and does not display it after saving. Never include the token value in screenshots, workbench prompts, or job output.
{% /callout %}

### Configure access

On the **Access policy** step, add the users or groups that should have read or write access to this configured tool:

* **Read permissions** control who can access and attach the tool to a workbench.
* **Write permissions** control who can modify the tool configuration and access policy.

Click **Save**. After the creation confirmation appears, the connection is available under **Workbenches → Configured Tools**.

## Attach Jira Cloud to a workbench

You can attach the tool while creating a workbench or add it to an existing one.

### New workbench

On the final **Attach tools** step of the workbench wizard:

1. Click **Add tools**.
2. Select the Jira Cloud connection by its configured name.
3. Complete the wizard by clicking **Create workbench**.

### Existing workbench

1. Open the workbench.
2. In the left sidebar, find **Tools** and click **Add tools**. You can also open the overflow menu and select **Tools**.
3. In **Add or remove tool from workbench**, select the Jira Cloud connection.
4. Click **Save**.

The configured Jira Cloud tool now appears in the workbench's **Tools** section.

## Use Jira from a workbench

Open the workbench's **Launch** tab and describe the task in the prompt box. The **Jobs** tab contains run history rather than the new-job prompt. Include the project, issue filters, and the action you want to take.

Try prompts such as:

* **Search issues:** `List open bugs in project ENG assigned to me, grouped by priority.`
* **Create an issue:** `Create a new bug in project ENG with summary "API returns 500 on /checkout" and description "Occurs under load during peak hours. See attached logs."`
* **Update an issue:** `Add a comment to ENG-1234 with "Deployed fix to staging. Ready for verification."`
* **Workflow transition:** `Move ENG-1234 to Done and add a comment with "Verified in production."`
* **Investigation:** `Find all P0 bugs in project OPS created in the last 7 days. For each, list the comments and current status.`

Use [JQL syntax](https://support.atlassian.com/jira-service-management-cloud/docs/use-advanced-search-with-jira-query-language-jql/) directly in prompts when you need precise filtering. For example: `Search for issues with JQL "project = ENG AND status = 'In Progress' AND updated >= -7d" and summarize by assignee.`

Submit the job and watch its activity stream. To verify the integration, confirm that the job completes, open its Jira tool activity, and check that the call succeeded and returned data. A tool activity entry can also contain an API error, so its presence alone does not verify the connection. For more about job output, see [Running workbench jobs](/plural-features/workbenches/running-jobs).

## Query behavior and limits

Keep these behaviors in mind when working with the Jira Cloud tool:

* **Pagination:** Issue and comment searches return up to 100 results per page. The response includes a `nextCursor` field when more results are available. The agent automatically fetches additional pages when needed, but very broad queries may hit internal limits.
* **JQL validation:** JQL syntax errors are returned by Jira as `400` responses. Use narrow, tested queries to avoid failures.
* **Field selection:** When listing issues, specify only the fields you need (`summary`, `status`, `assignee`, etc.) to reduce response size and improve performance.
* **Transitions:** Available transitions depend on the issue's current status and the account's permissions. Always list transitions first to discover which ones are available for a specific issue.
* **Rate limits:** Jira Cloud enforces rate limits per account. Avoid repeatedly searching for the same results or making rapid-fire updates.

## Troubleshooting

### Authentication or permission errors

* Confirm that the configured **Email** and **API token** belong to the same Atlassian account and that the token is valid.
* For a `403` response, verify that the account has the required project permissions for the operation being attempted.
* For a `404` response on an issue that exists, verify that the account has **Browse Projects** permission for the issue's project.
* If the API token was recently rotated, open **Workbenches → Configured Tools**, select **Edit configuration**, and enter the new token. Existing secret values are never displayed.

### JQL or query errors

* If a search fails with `400`, check the JQL syntax in the job's activity stream for typos or invalid field names.
* Use the Jira UI's issue search to validate JQL before including it in a workbench prompt.
* For project or issue type mismatches, verify that the project key and issue type name match exactly what exists in Jira (project keys are case-sensitive).

### No data is returned

* Verify in Jira Cloud that the expected issues exist and are visible to the configured account.
* Check project keys, issue keys, and JQL filters for spelling or scope mismatches.
* Confirm that the tool is attached to the workbench. Reopen the workbench's **Tools** dialog and verify that the Jira Cloud connection is selected.

### Workflow transitions fail

* List the available transitions for the issue first. The transition you want may not be available from the issue's current status.
* Verify that the account has **Transition Issues** permission in the project.
* If the transition requires additional fields (such as resolution or a custom field), include them in the `fields` parameter of the transition request.

### The Jira tool is unavailable

* Confirm that the tool appears under **Workbenches → Configured Tools**.
* Verify that your user or group has read access to the configured tool.
* Reopen the workbench's **Tools** dialog and confirm that the Jira Cloud connection is selected.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
* [Atlassian](/plural-features/workbenches/integrations/tools/atlassian) — MCP-based Atlassian integration for Jira and Confluence Cloud
* [Jira Data Center](/plural-features/workbenches/integrations/tools/jira-datacenter) — Plural-hosted integration for self-hosted Jira instances
