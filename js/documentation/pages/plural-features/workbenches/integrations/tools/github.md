---
title: GitHub
description: Read and comment on GitHub issues, pull requests, releases, and security alerts from a workbench
---

The GitHub tool lets a workbench agent call the [GitHub REST API](https://docs.github.com/en/rest) for issues, pull requests, repositories, and security alerts. The agent can read issues and pull requests, including diffs, check runs, and reviews; search issues, pull requests, and repositories; read branches, tags, and releases; and read code scanning, Dependabot, and secret scanning alerts. It can also comment, review, react, and close pull requests. You authenticate with a personal access token or a GitHub App installation, on GitHub.com or GitHub Enterprise Server.

For the complete list of integrations and general tool behavior, see [Workbench tools](/plural-features/workbenches/integrations/tools).

## Prerequisites

Before you begin, make sure you have:

* A GitHub account or organization with the repositories the workbench should work with.
* Either a [personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) or a [GitHub App](https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/about-creating-github-apps) that you can install on those repositories.
* Permission in Plural Console to create a configured tool and edit the target workbench.
* An existing workbench, or permission to create one. See [Setting up a workbench](/plural-features/workbenches/configuration).

{% callout severity="warning" %}
The token or app permissions are the only limit on what the agent can change. The tool has no read-only mode, so an agent with write permissions can post comments, submit reviews, and close pull requests. Grant write permissions only when the workbench needs them.
{% /callout %}

### Option A: personal access token

1. In GitHub, open **Settings → Developer settings → Personal access tokens**.
2. Create a **fine-grained token** and select the resource owner and the repositories the workbench needs. A classic token also works.
3. Grant the permissions from [GitHub permissions](#github-permissions) for the operations you plan to use.
4. Generate the token and copy its value.

A fine-grained token cannot read check runs. If the workbench needs check results, use a GitHub App or a classic token.

### Option B: GitHub App

A GitHub App is not tied to an individual user and gets short-lived installation tokens.

1. In GitHub, open **Settings → Developer settings → GitHub Apps**. To create the app for an organization, use the organization's settings instead.
2. Click **New GitHub App** and enter a **GitHub App name** and **Homepage URL**.
3. Under **Webhook**, clear **Active**. The tool does not need GitHub to send it events.
4. Under **Repository permissions**, grant the permissions from [GitHub permissions](#github-permissions).
5. Choose where the app can be installed, then click **Create GitHub App**.
6. Copy the numeric **App ID** from the top of the app settings page.
7. Under **Private keys**, click **Generate a private key** and save the downloaded `.pem` file.
8. Click **Install App** in the sidebar and install the app on the account or organization that owns the repositories.
9. Open the installation and copy the **Installation ID**, the final segment of its URL. For example, in `https://github.com/organizations/ORG/settings/installations/12345678`, the installation ID is `12345678`.

### GitHub permissions

GitHub always grants the **Metadata** read permission. Add the permissions for the operations you plan to use. For classic tokens, the `repo` scope covers every operation. The `security_events` scope also covers the security alert operations.

| Operations | Fine-grained token or GitHub App permission |
|---|---|
| Read and list issues, issue comments, labels, and sub-issues | **Issues**: Read |
| Comment on issues, edit issue comments, react to issue comments | **Issues**: Read and write |
| Read pull requests, diffs, changed files, reviews, and review comments | **Pull requests**: Read |
| Review, reply to review comments, edit review comments, react to review comments, close pull requests | **Pull requests**: Read and write |
| Read the combined commit status of a pull request (`get_status`) | **Commit statuses**: Read |
| Read check runs of a pull request (`get_check_runs`) | **Checks**: Read (GitHub App only) |
| List branches and releases, read releases and tags | **Contents**: Read |
| React to commit comments | **Contents**: Read and write |
| Code scanning alerts | **Code scanning alerts**: Read |
| Dependabot alerts | **Dependabot alerts**: Read |
| Secret scanning alerts | **Secret scanning alerts**: Read |

The search operations need no extra permission, but GitHub only returns results from repositories the token can access. For the complete mapping, see [Permissions required for fine-grained personal access tokens](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens) and [Permissions required for GitHub Apps](https://docs.github.com/en/rest/authentication/permissions-required-for-github-apps).

## Capabilities

The operations are grouped into toolsets. You can register all of them or only one group. See [Configure the connection](#configure-the-connection).

### Issues

| Operation | What it does |
|---|---|
| `list_issues` | Lists issues in a repository, filtered by state, labels, `since`, sort, and direction. GitHub includes pull requests in this list. |
| `search_issues` | Runs a [GitHub search query](https://docs.github.com/en/search-github/searching-on-github/searching-issues-and-pull-requests). With an owner and repository, the search is limited to issues in that repository. Without them, the query runs as written. |
| `issue_read` | Reads an issue (`get`), its comments (`get_comments`), its labels (`get_labels`), or its sub-issues (`get_sub_issues`). |
| `add_issue_comment` | Adds a comment to an issue or to a pull request's conversation. |
| `update_comment` | Edits an issue comment, an inline pull request review comment, or the summary of a pull request review. |

### Pull requests

| Operation | What it does |
|---|---|
| `list_pull_requests` | Lists pull requests in a repository, filtered by state, head, base, sort, and direction. A bare head branch name is matched in the same repository. |
| `search_pull_requests` | Runs a GitHub search query limited to pull requests, optionally in one repository. |
| `pull_request_read` | Reads a pull request (`get`), its raw diff (`get_diff`), its changed files (`get_files`), its reviews (`get_reviews`), its inline review comments (`get_review_comments`), its conversation comments (`get_comments`), or, for the head commit, the combined status (`get_status`) or check runs (`get_check_runs`). |
| `pull_request_review_write` | Creates a review with an optional body, verdict, and inline comments (`create`), submits a pending review (`submit`), or deletes a pending review (`delete`). |
| `add_comment_to_pending_review` | Creates a review with inline comments. Without a verdict, GitHub keeps the review pending until it is submitted. |
| `add_reply_to_pull_request_comment` | Replies to an inline review comment. |
| `add_reaction_to_pull_request_comment` | Adds an emoji reaction, such as `+1`, `heart`, or `eyes`, to an inline review comment, an issue or pull request conversation comment, or a commit comment. |
| `remove_reaction_from_pull_request_comment` | Removes a reaction from one of those comments. |
| `update_comment` | Edits a comment or review summary, as in the issues toolset. |
| `close_pull_request` | Closes an open pull request without merging it. |

### Repositories

| Operation | What it does |
|---|---|
| `search_repositories` | Searches repositories with a GitHub search query. |
| `list_branches` | Lists the branches of a repository. |
| `list_tags` | Lists the tags of a repository. |
| `get_tag` | Reads the Git reference of one tag. |
| `list_releases` | Lists the releases of a repository. |
| `get_latest_release` | Reads the latest published release. |
| `get_release_by_tag` | Reads the release for a tag. |

### Security

| Operation | What it does |
|---|---|
| `list_code_scanning_alerts` | Lists code scanning alerts, filtered by state, ref, severity, and tool name. |
| `get_code_scanning_alert` | Reads one code scanning alert. |
| `list_dependabot_alerts` | Lists Dependabot alerts, filtered by state, severity, ecosystem, package, manifest, scope, and other GitHub filters. |
| `get_dependabot_alert` | Reads one Dependabot alert. |
| `list_secret_scanning_alerts` | Lists secret scanning alerts, filtered by state, secret type, and resolution. |
| `get_secret_scanning_alert` | Reads one secret scanning alert. |

The tool cannot create issues or pull requests, merge pull requests, push code, or change repository settings. Read-only surfaces, such as the workbench MCP server, leave out the operations that write to GitHub.

## Create the GitHub tool

1. In Plural Console, open **Workbenches → Integrations**.
2. Find the **GitHub** card and click **Add tool**.

### Configure the connection

On the **Configuration** step, enter:

* **Name**: a recognizable name for the connection, such as `github-platform`.
* **API URL**: optional. Leave it empty for GitHub.com. For GitHub Enterprise Server, enter your instance's API root, such as `https://github.example.com/api/v3/`. If you enter only the instance URL, Plural adds `/api/v3/`.
* **Access token**: the personal access token. Leave it empty if you use a GitHub App.
* **Toolset**: the operation groups to register. Choose **All (issues, pull requests, repos, security)**, the default, or one of **Issues only**, **Pull requests only**, **Repos only**, and **Security only**. To use two groups but not all four, create a separate configured tool for each group.

To use a GitHub App instead of a token, expand **GitHub App authentication** and enter:

* **App ID**: the numeric app ID.
* **Installation ID**: the installation ID from the installation URL.
* **App private key (PEM)**: the private key file you generated.

When **App ID** is set, Plural uses the GitHub App and ignores the access token. App ID, Installation ID, and the private key are then all required.

Click **Next**.

{% callout severity="warning" %}
Treat the access token and private key as secrets. Plural stores them encrypted and does not display them after saving. When you edit the tool, leave the token or key empty to keep the stored value.
{% /callout %}

### Configure access

On the **Access policy** step, add the users or groups that should have read or write access to this configured tool:

* **Read permissions** control who can access and attach the tool to a workbench.
* **Write permissions** control who can modify the tool configuration and access policy.

Click **Save**. The connection is then available under **Workbenches → Configured Tools**.

## Attach GitHub to a workbench

You can attach the tool while creating a workbench or add it to an existing one.

### New workbench

On the final **Attach tools** step of the workbench wizard:

1. Click **Add tools**.
2. Select the GitHub connection by its configured name.
3. Complete the wizard by clicking **Create workbench**.

### Existing workbench

1. Open the workbench.
2. In the left sidebar, find **Tools** and click **Add tools**. You can also open the overflow menu and select **Tools**.
3. In **Add or remove tool from workbench**, select the GitHub connection.
4. Click **Save**.

## Use GitHub from a workbench

Open the workbench's **Launch** tab and describe the task in the prompt box. Name the repository as `owner/repo` and give issue or pull request numbers when you have them.

Try prompts such as:

* `List open pull requests in acme/payments that target main and summarize which ones have failing checks.`
* `Read the diff of acme/payments#482 and post a review that requests changes for any missing error handling.`
* `Search acme/payments for open issues labeled incident from the last week and summarize them.`
* `List open critical Dependabot alerts in acme/payments and group them by package.`
* `What changed between the last two releases of acme/payments?`

To verify the integration, open the job's GitHub tool activity and check that the call succeeded. A failed call shows the GitHub API status and error. For more about job output, see [Running workbench jobs](/plural-features/workbenches/running-jobs).

## Query behavior and limits

* **Pages.** List, search, and comment operations return one page at a time. Most default to page 1 with 30 results per page, and the agent can ask for up to 100. List results include `pagination` details, such as `has_next_page` and `next_page`, so the agent can request the next page.
* **Cursor paging for some alerts.** Dependabot and secret scanning alerts page with the `before` and `after` cursors that GitHub returns instead of page numbers.
* **Search syntax.** Search operations use GitHub search syntax and are subject to GitHub's [search rate limits](https://docs.github.com/en/rest/search/search#rate-limit).
* **Diffs are returned whole.** `get_diff` returns the full raw diff. Use `get_files` for a large pull request.
* **Reviews.** `pull_request_review_write` cannot resolve review threads.

## Troubleshooting

### Authentication or permission errors

* A `401` response means the token is invalid or expired, or the GitHub App credentials do not match. Check the App ID, Installation ID, and private key together.
* A `403` or `404` response for a repository usually means the token or app installation cannot access it, or lacks the permission for that operation. Compare the failed operation with [GitHub permissions](#github-permissions). GitHub returns `404` instead of `403` for private repositories the token cannot see.
* If only `get_check_runs` fails with a fine-grained token, use a GitHub App or a classic token. Fine-grained tokens cannot read check runs.
* For GitHub Enterprise Server, confirm that **API URL** points to your instance's API root.

### An operation is missing

* Check the **Toolset** setting. A tool limited to one group does not register the operations of the other groups.
* Confirm that the tool is attached to the workbench and that your user or group has read access to it.

### Empty results

* Confirm that the repository owner and name are spelled correctly.
* For security alerts, confirm that the feature, such as code scanning or Dependabot alerts, is enabled for the repository.
* For `search_issues` without a repository, add qualifiers such as `repo:` or `is:issue` to the query.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
* [GitHub webhook](/plural-features/workbenches/integrations/webhooks/github)
