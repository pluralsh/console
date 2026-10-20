---
title: Linear
description: Read and update Linear issues from a workbench
---

The Linear tool connects a workbench to Linear's hosted [MCP server](https://linear.app/docs/mcp), giving the agent the same tools Linear offers other AI clients for finding, creating, and updating issues, projects, and comments. Plural authenticates to the server with a Linear API key. Configure the connection once, then attach it to the workbenches that should use it.

This guide uses the Plural Console UI. For the complete list of integrations and general tool behavior, see [Workbench tools](/plural-features/workbenches/integrations/tools).

## Prerequisites

Before you begin, make sure you have:

* A Linear workspace, and an account that is allowed to create API keys. Linear admins can always create keys. Members can create keys only if an admin has allowed it under **Settings → Administration → API → Member API keys**.
* Permission in Plural Console to create a configured tool and edit the target workbench.
* An existing workbench, or permission to create one. See [Setting up a workbench](/plural-features/workbenches/configuration).
* Outbound HTTPS access from Plural Console to `https://mcp.linear.app`.

### Create a Linear API key

1. In Linear, open **Settings → Account → Security & Access**.
2. Create a new personal API key and give it a descriptive name, such as `Plural Workbench`.
3. Choose the key's access. You can give it full access to the data your user can access, or restrict it to specific permissions: **Read**, **Write**, **Admin**, **Create issues**, or **Create comments**. You can also limit the key to specific teams.
4. Create the key and copy its value immediately.

The key acts as the Linear user who created it, so every issue, comment, or update the agent makes is attributed to that user. Create the key from a dedicated integration account rather than a personal admin account, and grant only the permissions and teams the workbenches need. See Linear's [API and webhooks](https://linear.app/docs/api-and-webhooks) documentation for details on API keys.

{% callout severity="info" %}
For a read-only integration, create a key with only the **Read** permission. Linear's MCP server accepts restricted API keys, and Linear recommends a **Read**-only key for read-only access. The agent can then search and summarize issues but cannot change anything in Linear.
{% /callout %}

## Capabilities

The agent's operations are the tools Linear's MCP server exposes. Plural adds no Linear operations of its own. Linear describes these tools as covering finding, creating, and updating objects such as issues, projects, and comments, and adds tools over time.

Each server tool appears to the agent as `linear_<tool name>_<server tool>`, where `<tool name>` is the configured tool's name and `<server tool>` is the name Linear reports. Plural lists the server's tools when a job starts, so tools Linear adds later become available to the next job. When the agent calls a tool, Plural forwards the arguments unchanged and returns the text content of the result.

Plural connects to Linear's read-write endpoint and does not limit which of its tools the agent can call. The API key's permissions and team restrictions decide what the agent can actually read and change. To block specific tools, deny them by name with a [workbench policy](/plural-features/policy-management/workbench-policies).

## Create the Linear tool

1. In Plural Console, open **Workbenches → Integrations**.
2. Find the **Linear** card and click **Add tool**.

### Configure the connection

On the **Configuration** step, enter:

* **Name** — a recognizable name for the connection, such as `linear_eng`. It must start with a lowercase letter, end with a letter or number, and contain only lowercase letters, numbers, dots, and underscores. It becomes part of each operation name the agent sees.
* **Access token** — the Linear API key.

Click **Next**.

{% callout severity="warning" %}
Treat the API key as a secret. Plural stores it encrypted and does not display it after saving. Never include it in screenshots, workbench prompts, or job output.
{% /callout %}

### Configure access

On the **Access policy** step, add the users or groups that should have read or write access to this configured tool:

* **Read permissions** control who can access and attach the tool to a workbench.
* **Write permissions** control who can modify the tool configuration and access policy.

Click **Save**. After the creation confirmation appears, the connection is available under **Workbenches → Configured Tools**.

## Attach Linear to a workbench

You can attach the tool while creating a workbench or add it to an existing one.

### New workbench

On the final **Attach tools** step of the workbench wizard:

1. Click **Add tools**.
2. Select the Linear connection by its configured name.
3. Complete the wizard by clicking **Create workbench**.

### Existing workbench

1. Open the workbench.
2. In the left sidebar, find **Tools** and click **Add tools**. You can also open the overflow menu and select **Tools**.
3. In **Add or remove tool from workbench**, select the Linear connection.
4. Click **Save**.

The configured Linear tool now appears in the workbench's **Tools** section.

## Use Linear from a workbench

Open the workbench's **Launch** tab and describe the task in the prompt box. The **Jobs** tab contains run history rather than the new-job prompt. Name the Linear team, project, or issue identifier, and say whether the agent should only read or also make changes.

Try prompts such as:

* **Triage:** `List open bugs in the Linear team PLAT created in the last 7 days. Group them by component and flag any that mention checkout.`
* **Investigate an issue:** `Read Linear issue PLAT-123, investigate the failing deployment it describes, and add a comment with your findings.`
* **File work:** `Create a Linear issue in team PLAT titled "Raise memory limit for payments-api" with the evidence from this investigation in the description.`
* **Summarize:** `Summarize what the PLAT team completed in its most recent cycle.`

Submit the job and watch its activity stream. To verify the integration, open the Linear tool activity and check that the call succeeded and returned data. A tool activity entry can also contain an error from Linear, so its presence alone does not verify the connection. For more about job output, see [Running workbench jobs](/plural-features/workbenches/running-jobs).

To start jobs from Linear issue events instead, use the [Linear webhook](/plural-features/workbenches/integrations/webhooks/linear).

## Connection behavior

* **Tool discovery at job start.** Plural connects to Linear and lists its tools when a job starts. If Plural cannot list them, for example because the key is invalid, the agent has no Linear operations in that job.
* **One connection per configured tool.** Jobs that use the same configured tool share one connection to Linear. Changing the access token replaces the connection on next use.
* **Text results only.** The agent receives the concatenated text parts of each result.

## Troubleshooting

### The agent does not see Linear tools

* Confirm that the API key is valid and has not been revoked. Plural cannot list Linear's tools with a key that Linear rejects.
* Confirm that Plural Console can reach `https://mcp.linear.app` over HTTPS, including any egress proxy or firewall rules.
* To rotate the key, open **Workbenches → Configured Tools**, select **Edit configuration**, and enter the replacement value. The existing key is never displayed.

### A tool call fails or returns no data

* Open the failed activity in the job. Plural reports the server's error as `MCP Server tool <name> for <tool> has error`.
* If write tools fail but reads work, check whether the key has only the **Read** permission or lacks **Create issues** or **Create comments**.
* If expected issues are missing, check whether the key is restricted to specific teams and whether the key's user can see those teams.
* Check team keys, issue identifiers, and filters in the prompt for spelling mistakes.

### The Linear tool is unavailable

* Confirm that the tool appears under **Workbenches → Configured Tools**.
* Verify that your user or group has read access to the configured tool.
* Reopen the workbench's **Tools** dialog and confirm that the Linear connection is selected.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
* [MCP](/plural-features/workbenches/integrations/tools/mcp) — connect any other MCP server to a workbench
