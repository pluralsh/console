---
title: Atlassian
description: Call Jira and Confluence Cloud from a workbench
---

The Atlassian tool connects a workbench to Atlassian's [Model Context Protocol (MCP) server](https://modelcontextprotocol.io), giving the agent access to Jira and Confluence Cloud with an API token or service account. Configure the connection once, then attach it to the workbenches that should use it.

This guide uses the Plural Console UI. For the complete list of integrations and general tool behavior, see [Workbench tools](/plural-features/workbenches/integrations/tools).

## Prerequisites

Before you begin, make sure you have:

* An Atlassian Cloud account with active Jira or Confluence sites.
* Permission in Plural Console to create a configured tool and edit the target workbench.
* An existing workbench, or permission to create one. See [Setting up a workbench](/plural-features/workbenches/configuration).

You will also need one of the following:

* **Option A:** An Atlassian account email and API token for basic authentication.
* **Option B:** A service account credential payload in JSON format, if your environment uses service accounts.

## Capabilities

The Atlassian MCP server provides access to operations across Jira and Confluence Cloud. The exact tools available depend on the capabilities exposed by Atlassian's MCP server and may include:

* **Jira:** Search, create, and update issues; add comments; transition issues through workflows; list projects and issue types.
* **Confluence:** Search pages and spaces; read page content; create and update pages.

The agent discovers the available operations dynamically when the connection is established. All operations respect the permissions granted to the configured account.

{% callout severity="info" %}
The Atlassian tool uses Atlassian's hosted MCP server at `https://mcp.atlassian.com/v1`. Unlike the Jira Cloud and Jira Data Center tools (which are Plural-hosted integrations), this tool delegates to Atlassian's infrastructure for tool discovery and execution.
{% /callout %}

## Create credentials in Atlassian

### Option A: API token (recommended)

For basic authentication with an email and API token:

1. Open your [Atlassian account security settings](https://id.atlassian.com/manage-profile/security/api-tokens).
2. Click **Create API token**.
3. Enter a descriptive label, such as `Plural Workbench`.
4. Click **Create** and copy the token value immediately. It is displayed only once.

Use a dedicated integration account with only the project and space permissions required for the workbenches. Avoid granting Jira or Confluence administration permissions unless necessary.

### Option B: Service account JSON

If your organization uses Atlassian service accounts, obtain the service account credential JSON from your Atlassian administrator. The service account should be scoped to only the Jira projects and Confluence spaces the workbench needs to access.

## Recommended permissions

Grant the integration account or service account only the permissions required for the operations you plan to enable:

* **Jira:** Browse Projects, View Issues, Create Issues, Edit Issues, Add Comments, Transition Issues. Avoid granting Administer Jira or Delete Issues unless explicitly required.
* **Confluence:** View Space, Add Page, Edit Page. Avoid granting Space Admin or Delete Page unless explicitly required.

Permissions are enforced by Atlassian when the agent calls the MCP server. The workbench does not validate permissions upfront — calls that exceed the account's permissions will fail at runtime with an authorization error.

## Create the Atlassian tool

1. In Plural Console, open **Workbenches → Integrations**.
2. Find the **Atlassian** card and click **Add tool**.

### Configure the connection

On the **Configuration** step, enter:

* **Name** — a recognizable name for the connection, such as `atlassian-production`.
* **Email** (Option A) — the Atlassian account email address.
* **API token** (Option A) — the API token created above.
* **Service account (JSON)** (Option B) — the complete service account credential payload in JSON format.

Fill either **Email** + **API token** OR **Service account (JSON)**. Do not mix both options.

Click **Next**.

{% callout severity="warning" %}
Treat credentials as secrets. Plural stores them encrypted and does not display them after saving. Never include credential values in screenshots, workbench prompts, or job output.
{% /callout %}

### Configure access

On the **Access policy** step, add the users or groups that should have read or write access to this configured tool:

* **Read permissions** control who can access and attach the tool to a workbench.
* **Write permissions** control who can modify the tool configuration and access policy.

Click **Save**. After the creation confirmation appears, the connection is available under **Workbenches → Configured Tools**.

## Attach Atlassian to a workbench

You can attach the tool while creating a workbench or add it to an existing one.

### New workbench

On the final **Attach tools** step of the workbench wizard:

1. Click **Add tools**.
2. Select the Atlassian connection by its configured name.
3. Complete the wizard by clicking **Create workbench**.

### Existing workbench

1. Open the workbench.
2. In the left sidebar, find **Tools** and click **Add tools**. You can also open the overflow menu and select **Tools**.
3. In **Add or remove tool from workbench**, select the Atlassian connection.
4. Click **Save**.

The configured Atlassian tool now appears in the workbench's **Tools** section.

## Use the Atlassian tool from a workbench

Open the workbench's **Launch** tab and describe the task in the prompt box. The **Jobs** tab contains run history rather than the new-job prompt. Include the Jira project or Confluence space, the action you want to take, and any relevant filters or context.

Try prompts such as:

* **Jira issues:** `List open issues in project ENG tagged priority:high. Group by assignee and summarize the most common issue types.`
* **Jira workflow:** `Create a new bug in project ENG with summary "Login page returns 500 under load" and assign it to the API team.`
* **Confluence search:** `Search the DevOps space for pages about the deploy pipeline and summarize the rollback procedure.`
* **Cross-product:** `Find all P0 incidents in Jira project OPS from the last 7 days and check if each has a linked postmortem page in the Incidents Confluence space.`

Submit the job and watch its activity stream. To verify the integration, confirm that the job completes, open its Atlassian tool activity, and check that the call succeeded and returned data. A tool activity entry can also contain an API error, so its presence alone does not verify the connection. For more about job output, see [Running workbench jobs](/plural-features/workbenches/running-jobs).

## Troubleshooting

### Authentication or permission errors

* Confirm that the configured email and API token belong to the same Atlassian account and that the token is valid.
* For a `403` response, verify that the account has the required permissions for the Jira project or Confluence space being accessed.
* If using a service account, verify that the JSON payload is complete and correctly formatted and that the service account has not been disabled.
* To rotate credentials, open **Workbenches → Configured Tools**, select **Edit configuration**, and enter the replacement secret. Existing secret values are never displayed.

### MCP connection errors

* If the job fails with a connection or transport error, verify that the Atlassian MCP server is reachable from your Plural deployment. This is rare but can occur if network policies or firewall rules block outbound HTTPS to `https://mcp.atlassian.com`.
* Check the job's activity stream for MCP-specific error messages. These often include details about the failing operation or invalid arguments.

### No data is returned

* Verify in Atlassian Cloud that the expected Jira issues or Confluence pages exist and are accessible to the configured account.
* Check project keys, space keys, and issue filters for spelling or scope mismatches.
* Confirm that the tool is attached to the workbench. Reopen the workbench's **Tools** dialog and verify that the Atlassian connection is selected.

### The Atlassian tool is unavailable

* Confirm that the tool appears under **Workbenches → Configured Tools**.
* Verify that your user or group has read access to the configured tool.
* Reopen the workbench's **Tools** dialog and confirm that the Atlassian connection is selected.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
* [Jira Cloud](/plural-features/workbenches/integrations/tools/jira) — Plural-hosted Jira Cloud integration with explicit operation control
* [Jira Data Center](/plural-features/workbenches/integrations/tools/jira-datacenter) — Plural-hosted Jira Data Center integration for self-hosted instances
