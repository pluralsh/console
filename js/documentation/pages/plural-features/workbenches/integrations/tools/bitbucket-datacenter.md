---
title: Bitbucket Data Center
description: Read pull requests and post, edit, and react to comments in Bitbucket Data Center from a workbench
---

Use the Bitbucket Data Center tool to give a workbench access to pull requests in your self-hosted Bitbucket Data Center instance through its REST API. The agent can read a pull request and its comments, post and edit comments, reply to an existing comment, and add emoji reactions. The tool also includes operations for repository issues, which work only on servers that provide issue endpoints.

For the complete list of integrations and general tool behavior, see [Workbench tools](/plural-features/workbenches/integrations/tools).

## Prerequisites

Before you begin, make sure you have:

* A Bitbucket Data Center instance that Plural can reach over HTTPS.
* A Bitbucket account, or project or repository admin rights, to create an HTTP access token.
* Permission in Plural Console to create a configured tool and edit the target workbench.
* An existing workbench, or permission to create one. See [Setting up a workbench](/plural-features/workbenches/configuration).

### Create an HTTP access token

Plural authenticates with a Bitbucket [HTTP access token](https://confluence.atlassian.com/bitbucketserver/http-access-tokens-939515499.html), sent as a bearer token in the `Authorization` header. You can create the token for a user, or for a single project or repository:

* **User token:** In Bitbucket, select your profile picture, then **Manage account → HTTP access tokens**, and click **Create token**.
* **Project or repository token:** Open the project or repository settings, select **HTTP access tokens**, and click **Create token**. This requires project or repository admin permissions and a Data Center license.

Set a name, permissions, and an expiry. Copy the token when it is shown.

### Bitbucket permissions

Bitbucket sets a new token's permissions to your current access level. Lower them to the level the workbench needs:

| Workflow | Token permission |
|---|---|
| Read pull requests and their comments | **Repository read** (with **Project read** for a project token) |
| Post, edit, or reply to comments | **Repository write** |
| Add reactions to comments | **Repository write** |

Bitbucket only lets the author of a comment change its text. The agent can edit comments it posted with this token, but not comments written by other people. If calls fail with `401` or `403`, raise the token's repository or project permission rather than using an admin's personal token.

## Capabilities

Every operation takes the repository as `PROJECT_KEY/repository_slug`, for example `ACME/my-service`. This is not the `workspace/slug` form used by Bitbucket Cloud. Pull requests and issues are addressed by their numeric ID.

| Operation | What it does |
|---|---|
| `pull_request_read` | Reads one pull request by ID. With `include_comments`, also reads one page of its comments. The agent can pass `start` and `limit` to page through them. |
| `issue_read` | Reads one repository issue by ID. With `include_comments`, also reads one page of its comments, with the same `start` and `limit` paging. |
| `create_comment` | Posts a comment on a pull request or an issue. Pass `parent_comment_id` to reply to an existing comment. New comments are general comments, not tasks. |
| `update_comment` | Replaces the text of a pull request or issue comment. The agent must pass the comment's current `version`, taken from a comment it read or created. Bitbucket rejects the edit if the comment changed since then. |
| `react_to_comment` | Adds an emoji reaction to a pull request or issue comment through the Bitbucket comment-likes API. The reaction is a short name such as `thumbsup`, `heart`, `smile`, or `laughing`, not a Unicode emoji. |

The read-only operations are `pull_request_read` and `issue_read`. The others change data in Bitbucket and are left out of read-only surfaces such as the workbench MCP server. The tool cannot create, approve, merge, or decline pull requests, and it cannot delete comments.

{% callout severity="warning" %}
The Bitbucket Data Center REST API documents pull request comments and reactions, but not repository issues. `issue_read`, and `create_comment`, `update_comment`, and `react_to_comment` with an issue, work only if your instance serves issue endpoints under the repository. On other servers these calls return an error.
{% /callout %}

## Create the Bitbucket Data Center tool

1. In Plural Console, open **Workbenches → Integrations**.
2. Find the **Bitbucket Data Center** card and click **Add tool**.

### Configure the connection

On the **Configuration** step, enter:

* **Name** — a recognizable name for the connection, such as `bitbucket-prod`.
* **REST API base URL** — your Bitbucket REST API root, for example `https://bitbucket.example.com/rest/api/1.0` or `https://bitbucket.example.com/rest/api/latest`. If you enter only the site root, Plural appends `/rest/api/latest`. Reactions use the matching comment-likes API, such as `/rest/comment-likes/1.0`.
* **HTTP access token** — the token you created in Bitbucket.

**Registered SCM connection** is optional. When you select a Bitbucket Data Center SCM connection, the tool uses that connection's token and URL instead of the fields above.

{% callout severity="warning" %}
Fill in **REST API base URL** and **HTTP access token** even when you select a registered SCM connection. Without them the tool is saved without its own configuration, and every Bitbucket operation fails with an error that the tool is not configured.
{% /callout %}

Click **Next**.

{% callout severity="warning" %}
Treat the token as a secret. Plural stores it encrypted and does not display it after saving. Never include it in workbench prompts or job output.
{% /callout %}

### Configure access

On the **Access policy** step, add the users or groups that should have read or write access to this configured tool:

* **Read permissions** control who can access and attach the tool to a workbench.
* **Write permissions** control who can modify the tool configuration and access policy.

Click **Save**. The connection is then available under **Workbenches → Configured Tools**.

## Attach Bitbucket Data Center to a workbench

You can attach the tool while creating a workbench or add it to an existing one.

### New workbench

On the final **Attach tools** step of the workbench wizard:

1. Click **Add tools**.
2. Select the Bitbucket Data Center connection by its configured name.
3. Complete the wizard by clicking **Create workbench**.

### Existing workbench

1. Open the workbench.
2. In the left sidebar, find **Tools** and click **Add tools**. You can also open the overflow menu and select **Tools**.
3. In **Add or remove tool from workbench**, select the Bitbucket Data Center connection.
4. Click **Save**.

## Using it from a workbench

Open the workbench's **Launch** tab and describe the task. Name the repository as `PROJECT_KEY/repository_slug` and give the pull request ID from its URL, because the tool cannot search for pull requests by title or branch.

Try prompts such as:

* `Read pull request 42 in ACME/my-service and summarize what it changes.`
* `Post a comment on pull request 42 in ACME/my-service with the root cause you found and a link to the failing job.`
* `Reply to comment 1187 on pull request 42 in ACME/my-service confirming the fix is deployed.`
* `React with thumbsup to comment 1187 on pull request 42 in ACME/my-service.`

For more about job output, see [Running workbench jobs](/plural-features/workbenches/running-jobs).

## Limitations

* **No search or listing.** The agent needs the repository and the pull request or issue ID. It cannot list pull requests, repositories, or projects.
* **One page of comments per call.** Comments come back as one page with Bitbucket's `start`, `limit`, `isLastPage`, and `nextPageStart` fields. Bitbucket's default page size is 25. The agent reads further pages by calling again with a new `start`.
* **Comment listing sends no file path.** The Bitbucket API documents a file `path` parameter for listing pull request comments, and the tool does not send one. If `include_comments` fails or returns fewer comments than you expect, read the discussion in Bitbucket instead.
* **Only your own comments can be edited.** Bitbucket rejects text changes to comments that another user wrote.
* **Reactions on issues** use a comment-likes path that Bitbucket documents only for pull request and commit comments.

## Troubleshooting

* **401 Unauthorized or 403 Forbidden:** the token is wrong, expired, or revoked, or its project or repository permission is too low for the operation. Comments and reactions need **Repository write**. To replace the token, open **Workbenches → Configured Tools**, select **Edit configuration**, and enter the new token. Existing token values are never displayed.
* **404 Not Found:** check the `PROJECT_KEY/repository_slug` value, the pull request, issue, or comment ID, and that **REST API base URL** points at your Bitbucket REST API. Issue operations also fail on servers without issue endpoints.
* **409 Conflict:** when editing, the comment changed after the agent read it. Ask the agent to read it again and retry with its current version. Bitbucket also returns 409 for any comment change in an archived repository.
* **Tool is not configured:** see the warning in [Configure the connection](#configure-the-connection).

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
* [Bitbucket Data Center webhook](/plural-features/workbenches/integrations/webhooks/bitbucket-datacenter)
