---
title: Jira Data Center
description: Read and update Jira Data Center issues from a workbench
---

The Jira Data Center tool lets a workbench agent work with issues on a self-hosted Jira Data Center instance. Configure it with a dedicated account and personal access token, then attach it to the workbenches that should use it.

This guide uses the Plural Console UI. For the complete list of integrations and general tool behavior, see [Workbench tools](/plural-features/workbenches/integrations/tools).

## Prerequisites

Before you begin, make sure you have:

* A self-hosted Jira Data Center instance accessible from your Plural deployment.
* Permission in Plural Console to create a configured tool and edit the target workbench.
* A dedicated Jira account for the integration, with only the project permissions the workbench needs.
* A personal access token for that account. See [Create a personal access token](#create-a-personal-access-token) below.
* An existing workbench, or permission to create one. See [Setting up a workbench](/plural-features/workbenches/configuration).

## Capabilities

The agent can call these operations on the configured Jira Data Center instance:

* **`jira_list_issues`** — Search Jira issues with JQL (Jira Query Language). Returns paginated results with offset-based pagination. Supports field selection to limit the response size.
* **`jira_get_issue`** — Get a single Jira issue by key or ID. Supports field selection and expansion of related data such as changelog or rendered fields.
* **`jira_save_issue`** — Create a new issue or update an existing one. Requires project key, issue type, and summary for creation. Updates apply only the fields provided in the request.
* **`jira_list_comments`** — List comments on an issue. Returns paginated results with offset-based pagination.
* **`jira_save_comment`** — Create a new comment or update an existing one on an issue. Supports visibility restrictions (role or group).
* **`jira_list_transitions`** — List the workflow transitions available for an issue based on its current status and the account's permissions.
* **`jira_transition_issue`** — Transition an issue through its workflow. Can optionally set fields or add updates as part of the transition.

All operations use the Jira REST API v2 (`/rest/api/2`) with Bearer authentication (personal access token). The implementation is shared with the Jira Cloud tool, but pagination uses integer offsets (`startAt`) instead of opaque tokens.

## Create a personal access token

1. Sign in to Jira Data Center as the integration account.
2. Open your account's personal access token settings. The exact path depends on your Jira version but is typically under **Profile → Personal Access Tokens** or **Account Settings → Security → Personal Access Tokens**.
3. Click **Create token** or **Generate new token**.
4. Enter a descriptive name, such as `Plural Workbench`, and optionally set an expiration date.
5. Click **Create** and copy the token value immediately. It is displayed only once.

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

Do not grant **Jira System Administrators** or project-level **Administer Projects** unless explicitly required. For read-only workbenches, grant only **Browse Projects** and **View Issues**.

Permissions are enforced by Jira when the agent calls the API. The workbench does not validate permissions upfront — calls that exceed the account's permissions will fail at runtime with a `403` or `404` error.

## Create the Jira Data Center tool

1. In Plural Console, open **Workbenches → Integrations**.
2. Find the **Jira Data Center** card and click **Add tool**.

### Configure the connection

On the **Configuration** step, enter:

* **Name** — a recognizable name for the connection, such as `jira-datacenter-production`.
* **Jira Data Center URL** — the base URL users open in a browser, such as `https://jira.example.com`. Include the protocol and hostname, but not a trailing `/rest/api/2` path.
* **Personal access token** — the personal access token created above.

Click **Next**.

{% callout severity="warning" %}
Treat the personal access token as a secret. Plural stores it encrypted and does not display it after saving. Never include the token value in screenshots, workbench prompts, or job output.
{% /callout %}

### Configure access

On the **Access policy** step, add the users or groups that should have read or write access to this configured tool:

* **Read permissions** control who can access and attach the tool to a workbench.
* **Write permissions** control who can modify the tool configuration and access policy.

Click **Save**. After the creation confirmation appears, the connection is available under **Workbenches → Configured Tools**.

## Attach Jira Data Center to a workbench

You can attach the tool while creating a workbench or add it to an existing one.

### New workbench

On the final **Attach tools** step of the workbench wizard:

1. Click **Add tools**.
2. Select the Jira Data Center connection by its configured name.
3. Complete the wizard by clicking **Create workbench**.

### Existing workbench

1. Open the workbench.
2. In the left sidebar, find **Tools** and click **Add tools**. You can also open the overflow menu and select **Tools**.
3. In **Add or remove tool from workbench**, select the Jira Data Center connection.
4. Click **Save**.

The configured Jira Data Center tool now appears in the workbench's **Tools** section.

## Use Jira Data Center from a workbench

Open the workbench's **Launch** tab and describe the task in the prompt box. The **Jobs** tab contains run history rather than the new-job prompt. Include the project, issue filters, and the action you want to take.

Try prompts such as:

* **Search issues:** `List open bugs in project ENG assigned to me, grouped by priority.`
* **Create an issue:** `Create a new bug in project ENG with summary "API returns 500 on /checkout" and description "Occurs under load during peak hours. See attached logs."`
* **Update an issue:** `Add a comment to ENG-1234 with "Deployed fix to staging. Ready for verification."`
* **Workflow transition:** `Move ENG-1234 to Done and add a comment with "Verified in production."`
* **Investigation:** `Find all P0 bugs in project OPS created in the last 7 days. For each, list the comments and current status.`

Use [JQL syntax](https://confluence.atlassian.com/jirasoftwareserver/advanced-searching-939938733.html) directly in prompts when you need precise filtering. For example: `Search for issues with JQL "project = ENG AND status = 'In Progress' AND updated >= -7d" and summarize by assignee.`

Submit the job and watch its activity stream. To verify the integration, confirm that the job completes, open its Jira tool activity, and check that the call succeeded and returned data. A tool activity entry can also contain an API error, so its presence alone does not verify the connection. For more about job output, see [Running workbench jobs](/plural-features/workbenches/running-jobs).

## Query behavior and limits

Keep these behaviors in mind when working with the Jira Data Center tool:

* **Pagination:** Issue and comment searches return up to 100 results per page. The response includes a `nextCursor` field (an integer offset) when more results are available. The agent automatically fetches additional pages when needed, but very broad queries may hit internal limits.
* **JQL validation:** JQL syntax errors are returned by Jira as `400` responses. Use narrow, tested queries to avoid failures.
* **Field selection:** When listing issues, specify only the fields you need (`summary`, `status`, `assignee`, etc.) to reduce response size and improve performance.
* **Transitions:** Available transitions depend on the issue's current status and the account's permissions. Always list transitions first to discover which ones are available for a specific issue.
* **Rate limits:** Jira Data Center may enforce rate limits depending on your instance configuration. Avoid repeatedly searching for the same results or making rapid-fire updates.

## Troubleshooting

### Authentication or permission errors

* Confirm that the configured **Personal access token** is valid and belongs to the correct Jira account.
* For a `403` response, verify that the account has the required project permissions for the operation being attempted.
* For a `404` response on an issue that exists, verify that the account has **Browse Projects** permission for the issue's project.
* If the personal access token was recently rotated or expired, open **Workbenches → Configured Tools**, select **Edit configuration**, and enter the new token. Existing secret values are never displayed.

### Connection errors

* Verify that the **Jira Data Center URL** is correct and accessible from your Plural deployment.
* Check that firewall rules, network policies, or VPN requirements allow outbound HTTPS from Plural to the Jira instance.
* If using a custom port, include it in the URL (e.g., `https://jira.example.com:8443`).
* Confirm that the Jira instance certificate is trusted. Self-signed or internal CA certificates may require additional configuration in your Plural deployment.

### JQL or query errors

* If a search fails with `400`, check the JQL syntax in the job's activity stream for typos or invalid field names.
* Use the Jira UI's issue search to validate JQL before including it in a workbench prompt.
* For project or issue type mismatches, verify that the project key and issue type name match exactly what exists in Jira (project keys are case-sensitive).

### No data is returned

* Verify in Jira Data Center that the expected issues exist and are visible to the configured account.
* Check project keys, issue keys, and JQL filters for spelling or scope mismatches.
* Confirm that the tool is attached to the workbench. Reopen the workbench's **Tools** dialog and verify that the Jira Data Center connection is selected.

### Workflow transitions fail

* List the available transitions for the issue first. The transition you want may not be available from the issue's current status.
* Verify that the account has **Transition Issues** permission in the project.
* If the transition requires additional fields (such as resolution or a custom field), include them in the `fields` parameter of the transition request.

### The Jira Data Center tool is unavailable

* Confirm that the tool appears under **Workbenches → Configured Tools**.
* Verify that your user or group has read access to the configured tool.
* Reopen the workbench's **Tools** dialog and confirm that the Jira Data Center connection is selected.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
* [Atlassian](/plural-features/workbenches/integrations/tools/atlassian) — MCP-based Atlassian integration for Jira and Confluence Cloud
* [Jira Cloud](/plural-features/workbenches/integrations/tools/jira) — Plural-hosted integration for Jira Cloud
