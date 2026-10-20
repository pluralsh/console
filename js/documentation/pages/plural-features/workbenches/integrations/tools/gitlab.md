---
title: GitLab
description: Read, comment on, and close GitLab merge requests and issues from a workbench
---

The GitLab tool lets a workbench agent call the [GitLab REST API](https://docs.gitlab.com/api/rest/) for merge requests and issues. The agent can read a merge request or issue with its notes (comments), post and edit notes, award emoji on notes, and close a merge request without merging it. The tool works with GitLab.com and self-managed GitLab.

For the complete list of integrations and general tool behavior, see [Workbench tools](/plural-features/workbenches/integrations/tools).

## Prerequisites

Before you begin, make sure you have:

* A GitLab.com account or a self-managed GitLab instance with the projects the workbench should work with.
* A GitLab access token that can see those projects. See [Create an access token](#create-an-access-token).
* Permission in Plural Console to create a configured tool and edit the target workbench.
* An existing workbench, or permission to create one. See [Setting up a workbench](/plural-features/workbenches/configuration).

### Create an access token

You can use a [personal access token](https://docs.gitlab.com/user/profile/personal_access_tokens/), a [project access token](https://docs.gitlab.com/user/project/settings/project_access_tokens/), or a [group access token](https://docs.gitlab.com/user/group/settings/group_access_tokens/). A project or group token limits the agent to that project or group, so prefer one when the workbench only needs a few projects.

To create a personal access token:

1. In GitLab, select your avatar in the upper-right corner and select **Edit profile**.
2. In the left sidebar, select **Access → Personal access tokens**. On older GitLab versions, this is **User Settings → Access Tokens**.
3. Generate a token, enter a name and an expiry date, and select the scope from [GitLab scopes](#gitlab-scopes).
4. Create the token and copy its value. GitLab shows it only once.

For a project or group token, open the project or group, go to **Settings → Access tokens**, and select the same scope. The token also needs a role in the project that allows the actions you want, such as commenting or closing merge requests.

If you use [fine-grained personal access tokens](https://docs.gitlab.com/auth/tokens/fine_grained_access_tokens/) instead of scopes, grant permissions equivalent to the scopes below.

### GitLab scopes

| Operations | Scope |
|---|---|
| `merge_request_read`, `issue_read` | `read_api` |
| `create_note`, `update_note`, `award_emoji_on_note`, `close_merge_request` | `api` |

`read_api` is not enough for any operation that writes. Grant `read_api` only if the agent should never comment, react, or close merge requests. With `read_api`, write operations fail with a permission error. The tool has no read-only mode, so the token scope is what limits the agent.

## Capabilities

| Operation | What it does |
|---|---|
| `merge_request_read` | Reads a merge request by project and IID. With `include_notes`, it also returns one page of the merge request's notes. |
| `issue_read` | Reads an issue by project and IID. With `include_notes`, it also returns one page of the issue's notes. |
| `create_note` | Posts a note on a merge request or issue. The note is public by default. The agent can make it an internal note. |
| `update_note` | Edits a note on a merge request or issue, including a note inside a discussion thread. |
| `award_emoji_on_note` | Awards an emoji, such as `thumbs_up`, `eyes`, or `rocket`, on a note on a merge request or issue. |
| `close_merge_request` | Closes an open merge request without merging it. |

Each operation takes a project as either a numeric ID or a full path, such as `my-group/my-project`, and a merge request or issue IID, the number shown in GitLab after `!` or `#`.

The tool cannot list or search projects, merge requests, or issues, read diffs or pipelines, approve or merge merge requests, or create issues. Give the agent the project and IID in the prompt. Read-only surfaces, such as the workbench MCP server, offer only `merge_request_read` and `issue_read`.

## Create the GitLab tool

1. In Plural Console, open **Workbenches → Integrations**.
2. Find the **GitLab** card and click **Add tool**.

### Configure the connection

On the **Configuration** step, enter:

* **Name**: a recognizable name for the connection, such as `gitlab-platform`.
* **API URL**: optional. Leave it empty for GitLab.com. For self-managed GitLab, enter the instance URL, such as `https://gitlab.example.com`. Plural adds `/api/v4`, and also accepts a URL that already ends with `/api/v4`.
* **Access token**: the personal, project, or group access token.

Click **Next**.

{% callout severity="warning" %}
Treat the access token as a secret. Plural stores it encrypted and does not display it after saving. Never include it in screenshots, workbench prompts, or job output.
{% /callout %}

### Configure access

On the **Access policy** step, add the users or groups that should have read or write access to this configured tool:

* **Read permissions** control who can access and attach the tool to a workbench.
* **Write permissions** control who can modify the tool configuration and access policy.

Click **Save**. The connection is then available under **Workbenches → Configured Tools**.

## Attach GitLab to a workbench

You can attach the tool while creating a workbench or add it to an existing one.

### New workbench

On the final **Attach tools** step of the workbench wizard:

1. Click **Add tools**.
2. Select the GitLab connection by its configured name.
3. Complete the wizard by clicking **Create workbench**.

### Existing workbench

1. Open the workbench.
2. In the left sidebar, find **Tools** and click **Add tools**. You can also open the overflow menu and select **Tools**.
3. In **Add or remove tool from workbench**, select the GitLab connection.
4. Click **Save**.

## Use GitLab from a workbench

Open the workbench's **Launch** tab and describe the task in the prompt box. Name the project by its full path and give the merge request or issue number.

Try prompts such as:

* `Read merge request !128 in my-group/payments with its notes and summarize the open review feedback.`
* `Read issue #42 in my-group/payments and post an internal note with your root-cause analysis.`
* `Add a thumbs_up to the latest note on merge request !128 in my-group/payments.`
* `Close merge request !97 in my-group/payments and leave a note explaining that it was superseded by !128.`

To verify the integration, open the job's GitLab tool activity and check that the call succeeded. A failed call shows the GitLab API status and error. For more about job output, see [Running workbench jobs](/plural-features/workbenches/running-jobs).

## Query behavior and limits

* **Notes are paged.** `include_notes` returns one page of notes. The agent can pass `page` and `per_page` to read more. When it does not, GitLab's default page size applies.
* **No discovery.** The tool reads merge requests and issues only by IID. It cannot find them by title, label, or author.
* **Closing is not deleting.** `close_merge_request` sets the merge request to closed. You can reopen it in GitLab.

## Troubleshooting

### Authentication or permission errors

* A `401` response means the token is invalid, expired, or revoked.
* A `403` response on `create_note`, `update_note`, `award_emoji_on_note`, or `close_merge_request` usually means the token has only `read_api`. Create a token with `api`.
* A `404` response for a project means the token cannot see it, or the project path or IID is wrong. Project and group tokens only see their own project or group.
* For self-managed GitLab, confirm that **API URL** points to your instance.

### The GitLab tool is unavailable

* Confirm that the tool appears under **Workbenches → Configured Tools**.
* Verify that your user or group has read access to the configured tool.
* Reopen the workbench's **Tools** dialog and confirm that the GitLab connection is selected.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
* [GitLab webhook](/plural-features/workbenches/integrations/webhooks/gitlab)
