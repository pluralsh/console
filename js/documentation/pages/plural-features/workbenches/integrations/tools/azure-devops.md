---
title: Azure DevOps
description: Read pull requests and work items, comment, react, and abandon pull requests in Azure DevOps from a workbench
---

Use the Azure DevOps tool to give a workbench access to pull requests and work items through the [Azure DevOps REST API](https://learn.microsoft.com/en-us/rest/api/azure/devops/). The agent can read a pull request with its comment threads and a work item with its discussion, post and edit comments, add reactions, and abandon a pull request.

For the complete list of integrations and general tool behavior, see [Workbench tools](/plural-features/workbenches/integrations/tools).

## Prerequisites

Before you begin, make sure you have:

* An Azure DevOps organization with the projects, repositories, and work items the workbench should use.
* Permission in Plural Console to create a configured tool and edit the target workbench.
* An existing workbench, or permission to create one. See [Setting up a workbench](/plural-features/workbenches/configuration).

### Create a personal access token

Plural authenticates with a [personal access token (PAT)](https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate), sent with HTTP Basic authentication and an empty username. Consider creating it for a dedicated account, because comments and reactions appear under the token owner's name.

1. Sign in to Azure DevOps at `https://dev.azure.com/{organization}`.
2. Open **User settings → Personal access tokens** and click **New Token**.
3. Select the organization, set an expiry, and choose **Custom defined** scopes. Select the scopes from the next section.
4. Create the token and copy it. Azure DevOps shows it only once.

### Azure DevOps scopes

Grant only the scopes for the work the agent should do:

| Operations | Required PAT scope |
|---|---|
| `pull_request_read` | **Code: Read** |
| `create_comment`, `update_comment`, and `react_to_comment` on a pull request, and `close_pull_request` | **Code: Read & write** |
| `work_item_read` | **Work Items: Read** |
| `create_comment`, `update_comment`, and `react_to_comment` on a work item | **Work Items: Read & write** |

For a read-only agent, grant **Code: Read** and **Work Items: Read**. For an agent that comments, reacts, or abandons pull requests, grant **Code: Read & write** and **Work Items: Read & write**. The scopes limit which APIs the token can call. The token owner also needs access to the projects and repositories in Azure DevOps.

## Capabilities

Every operation takes the project name or ID. Pull request operations also take the repository name or ID and the numeric pull request ID. Work item operations take the work item ID.

| Operation | What it does |
|---|---|
| `pull_request_read` | Reads one pull request. With `include_threads`, also returns its comment threads, including the thread and comment IDs that other operations need. |
| `work_item_read` | Reads one work item, such as a bug, task, or user story. With `include_comments`, also returns its discussion comments. |
| `create_comment` | On a pull request, starts a new active comment thread with your text. On a work item, adds a discussion comment. It cannot reply inside an existing pull request thread. |
| `update_comment` | Replaces the text of a pull request thread comment or a work item comment. |
| `react_to_comment` | Likes a pull request thread comment. On a work item comment, adds one of `like`, `dislike`, `heart`, `hooray`, `smile`, or `confused`. Pull request comments support only `like`. |
| `close_pull_request` | Abandons an open pull request without merging it. |

The read-only operations are `pull_request_read` and `work_item_read`. The others change data in Azure DevOps and are left out of read-only surfaces such as the workbench MCP server. The tool cannot create, approve, or complete pull requests, and it cannot create or update work item fields.

## Create the Azure DevOps tool

1. In Plural Console, open **Workbenches → Integrations**.
2. Find the **Azure DevOps** card and click **Add tool**.

### Configure the connection

On the **Configuration** step, enter:

* **Name** — a recognizable name for the connection, such as `azure-devops`.
* **Personal access token (PAT)** — the token you created in Azure DevOps.

**Registered SCM connection** is optional. When you select an Azure DevOps SCM connection, the tool uses that connection's token and URL instead of the PAT above.

{% callout severity="warning" %}
Enter a PAT even when you select a registered SCM connection. Without it the tool is saved without its own configuration, and every Azure DevOps operation fails with an error that the tool is not configured.
{% /callout %}

The form has no URL field. Without a registered SCM connection, the tool calls `https://dev.azure.com`, and the agent must name the Azure DevOps organization on every call. Put the organization name in your prompts or in the workbench instructions.

Click **Next**.

{% callout severity="warning" %}
Treat the PAT as a secret. Plural stores it encrypted and does not display it after saving. Never include it in workbench prompts or job output.
{% /callout %}

### Configure access

On the **Access policy** step, add the users or groups that should have read or write access to this configured tool:

* **Read permissions** control who can access and attach the tool to a workbench.
* **Write permissions** control who can modify the tool configuration and access policy.

Click **Save**. The connection is then available under **Workbenches → Configured Tools**.

## Attach Azure DevOps to a workbench

You can attach the tool while creating a workbench or add it to an existing one.

### New workbench

On the final **Attach tools** step of the workbench wizard:

1. Click **Add tools**.
2. Select the Azure DevOps connection by its configured name.
3. Complete the wizard by clicking **Create workbench**.

### Existing workbench

1. Open the workbench.
2. In the left sidebar, find **Tools** and click **Add tools**. You can also open the overflow menu and select **Tools**.
3. In **Add or remove tool from workbench**, select the Azure DevOps connection.
4. Click **Save**.

## Using it from a workbench

Open the workbench's **Launch** tab and describe the task. Name the organization, project, and repository, and give the pull request or work item ID, because the tool cannot search or list them.

Try prompts such as:

* `In the contoso organization, read pull request 128 in project Platform, repository api-gateway, with its comment threads, and summarize the open review feedback.`
* `In the contoso organization, read work item 4521 in project Platform with its comments and tell me what is blocking it.`
* `Add a comment to work item 4521 in contoso/Platform with the root cause you found and the fix you recommend.`
* `Abandon pull request 131 in contoso/Platform, repository api-gateway, and comment on it explaining that it is superseded by pull request 128.`

For more about job output, see [Running workbench jobs](/plural-features/workbenches/running-jobs).

## Limitations

* **No search or listing.** The agent needs the IDs of the pull request or work item. It cannot list repositories, pull requests, or query work items.
* **New threads only.** `create_comment` on a pull request always starts a new thread. To change an existing comment, the agent uses `update_comment` with the thread and comment IDs from `pull_request_read`.
* **Pull request reactions are likes.** Other reaction types work only on work item comments.
* **Work item comments and reactions use preview API versions** of the Azure DevOps REST API, so Microsoft can change their behavior.
* **Abandoning is the only pull request state change.** The tool cannot complete, merge, or reactivate a pull request.

## Troubleshooting

* **Organization is required:** the tool has no organization in its URL. Name the organization in the prompt or in the workbench instructions.
* **401 Unauthorized:** the PAT is wrong, expired, revoked, or not valid for the organization. To replace it, open **Workbenches → Configured Tools**, select **Edit configuration**, and enter the new PAT. Existing PAT values are never displayed.
* **403 Forbidden:** the PAT lacks the scope for the operation, or its owner cannot access the project or repository. Writes need the **Read & write** scope for **Code** or **Work Items**.
* **404 Not Found:** check the organization, project, repository, and pull request, work item, thread, or comment IDs.
* **Tool is not configured:** see the warning in [Configure the connection](#configure-the-connection).

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
* [Azure DevOps webhook](/plural-features/workbenches/integrations/webhooks/azure-devops)
