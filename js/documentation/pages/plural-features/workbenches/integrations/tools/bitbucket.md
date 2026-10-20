---
title: Bitbucket Cloud
description: Read, comment on, and decline Bitbucket Cloud pull requests and issues from a workbench
---

The Bitbucket Cloud tool lets a workbench agent call the [Bitbucket Cloud REST API](https://developer.atlassian.com/cloud/bitbucket/rest/intro/) for pull requests and repository issues. The agent can read a pull request or issue with its comments, post and edit comments, and decline a pull request without merging it. For self-hosted Bitbucket, use the [Bitbucket Data Center](/plural-features/workbenches/integrations/tools/bitbucket-datacenter) tool instead.

For the complete list of integrations and general tool behavior, see [Workbench tools](/plural-features/workbenches/integrations/tools).

## Prerequisites

Before you begin, make sure you have:

* A Bitbucket Cloud workspace with the repositories the workbench should work with.
* A Bitbucket Cloud token that is sent as a bearer token. Use a user [API token](https://support.atlassian.com/bitbucket-cloud/docs/using-api-tokens/) or a repository, project, or workspace [access token](https://support.atlassian.com/bitbucket-cloud/docs/using-access-tokens/). See [Create a token](#create-a-token).
* Permission in Plural Console to create a configured tool and edit the target workbench.
* An existing workbench, or permission to create one. See [Setting up a workbench](/plural-features/workbenches/configuration).

{% callout severity="warning" %}
Do not use an app password. The tool sends the token in a `Bearer` authorization header without a username or email. Bitbucket documents bearer authentication for API tokens and access tokens, and Atlassian has replaced app passwords with API tokens.
{% /callout %}

### Create a token

To create a user API token:

1. In Bitbucket Cloud, select your profile in the upper-right corner and open **Account settings**.
2. On the Atlassian Account page, select **Security**, then **Create and manage API tokens**.
3. Select **Create API token with scopes**, enter a name and an expiry date, and select **Next**.
4. Select **Bitbucket** as the app, then select the scopes from [Bitbucket scopes](#bitbucket-scopes).
5. Create the token and copy its value. It is displayed only once.

A user API token acts with the permissions of your user. To limit the agent to one repository, project, or workspace, create an access token in that resource's settings instead and grant the same permissions.

### Bitbucket scopes

| Operations | API token scope |
|---|---|
| `pull_request_read`, `create_comment` and `update_comment` on pull requests | `read:pullrequest:bitbucket` |
| `close_pull_request` | `read:pullrequest:bitbucket` and `write:pullrequest:bitbucket` |
| `issue_read` | `read:issue:bitbucket` |

Bitbucket's pull request read scope already includes commenting on pull requests. Declining a pull request needs the write scope. Repository scopes do not grant access to pull requests, so a token with only `read:repository:bitbucket` cannot use this tool. See [API token permissions](https://support.atlassian.com/bitbucket-cloud/docs/api-token-permissions/) for the scope definitions.

The scope for commenting on issues is not documented in Bitbucket's current REST reference. If `create_comment` or `update_comment` on an issue returns `403` with `read:issue:bitbucket`, add `write:issue:bitbucket`.

## Capabilities

| Operation | What it does |
|---|---|
| `pull_request_read` | Reads a pull request by repository and ID. With `include_comments`, it also returns one page of its comments. |
| `issue_read` | Reads a repository issue by repository and ID. With `include_comments`, it also returns one page of its comments. The repository must have the issue tracker enabled. |
| `create_comment` | Posts a comment on a pull request or issue. With a parent comment ID, it posts a reply in that comment's thread. |
| `update_comment` | Edits a comment on a pull request or issue. |
| `react_to_comment` | Always returns an error. Bitbucket Cloud has no documented API for reactions on comments, so the agent cannot add them. |
| `close_pull_request` | Declines an open pull request without merging it. |

Each operation takes the repository as `workspace/repo_slug`, such as `acme/payments`.

The tool cannot list or search repositories, pull requests, or issues, read diffs or pipelines, approve or merge pull requests, or create issues. Give the agent the repository and ID in the prompt. The tool has no read-only mode, so the token's scopes are what limit the agent. Read-only surfaces, such as the workbench MCP server, offer only `pull_request_read` and `issue_read`.

## Create the Bitbucket Cloud tool

1. In Plural Console, open **Workbenches → Integrations**.
2. Find the **Bitbucket Cloud** card and click **Add tool**.

### Configure the connection

On the **Configuration** step, enter:

* **Name**: a recognizable name for the connection, such as `bitbucket-payments`.
* **API URL**: optional. Leave it empty to use `https://api.bitbucket.org/2.0`. Plural adds `/2.0` to a URL that does not already end with it.
* **App password or access token**: the API token or access token. Despite the label, do not enter an app password.

Click **Next**.

{% callout severity="warning" %}
Treat the token as a secret. Plural stores it encrypted and does not display it after saving. Never include it in screenshots, workbench prompts, or job output.
{% /callout %}

### Configure access

On the **Access policy** step, add the users or groups that should have read or write access to this configured tool:

* **Read permissions** control who can access and attach the tool to a workbench.
* **Write permissions** control who can modify the tool configuration and access policy.

Click **Save**. The connection is then available under **Workbenches → Configured Tools**.

## Attach Bitbucket Cloud to a workbench

You can attach the tool while creating a workbench or add it to an existing one.

### New workbench

On the final **Attach tools** step of the workbench wizard:

1. Click **Add tools**.
2. Select the Bitbucket Cloud connection by its configured name.
3. Complete the wizard by clicking **Create workbench**.

### Existing workbench

1. Open the workbench.
2. In the left sidebar, find **Tools** and click **Add tools**. You can also open the overflow menu and select **Tools**.
3. In **Add or remove tool from workbench**, select the Bitbucket Cloud connection.
4. Click **Save**.

## Use Bitbucket Cloud from a workbench

Open the workbench's **Launch** tab and describe the task in the prompt box. Name the repository as `workspace/repo_slug` and give the pull request or issue ID.

Try prompts such as:

* `Read pull request 214 in acme/payments with its comments and summarize the unresolved feedback.`
* `Reply to the latest comment on pull request 214 in acme/payments with the fix you propose.`
* `Read issue 37 in acme/payments and post a comment with your root-cause analysis.`
* `Decline pull request 198 in acme/payments and leave a comment explaining that it was superseded by pull request 214.`

To verify the integration, open the job's Bitbucket Cloud tool activity and check that the call succeeded. A failed call shows the Bitbucket API status and error. For more about job output, see [Running workbench jobs](/plural-features/workbenches/running-jobs).

## Query behavior and limits

* **Comments are paged.** `include_comments` returns one page of comments. The agent can pass `page` and `pagelen` to read more. When it does not, Bitbucket's default page size applies.
* **No discovery.** The tool reads pull requests and issues only by ID. It cannot find them by title, author, or state.
* **No reactions.** `react_to_comment` is registered but always fails on Bitbucket Cloud. Ask for a reply comment instead.

## Troubleshooting

### Authentication or permission errors

* A `401` response means the token is invalid, expired, or not a token that Bitbucket accepts as a bearer token, such as an app password. Create an API token or access token.
* A `403` response means the token lacks a scope for the operation. Compare the operation with [Bitbucket scopes](#bitbucket-scopes). Declining a pull request needs `write:pullrequest:bitbucket`.
* A `404` response means the repository, pull request, or issue does not exist or the token cannot see it. Check the `workspace/repo_slug` value.

### Issue operations fail

* Confirm that the repository has the issue tracker enabled in its settings.
* Confirm that the token has `read:issue:bitbucket`.

### The Bitbucket Cloud tool is unavailable

* Confirm that the tool appears under **Workbenches → Configured Tools**.
* Verify that your user or group has read access to the configured tool.
* Reopen the workbench's **Tools** dialog and confirm that the Bitbucket Cloud connection is selected.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
* [Bitbucket Cloud webhook](/plural-features/workbenches/integrations/webhooks/bitbucket)
