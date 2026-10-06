---
title: GitHub
description: Call the GitHub API from a workbench
---

The GitHub tool lets a workbench agent call the GitHub REST API for repositories, issues, and pull requests. Authenticate with a personal access token or a GitHub App installation, including GitHub Enterprise Server.

## Prerequisites

Before you begin, make sure you have:

* Permission in Plural Console to create a configured tool and edit the target workbench.
* Either a GitHub personal access token, or the App ID, installation ID, and PEM private key for a GitHub App you have installed on the target account or organization.
* For GitHub Enterprise Server, the API root for your instance (for example `https://github.mycompany.com/api/v3/`).

### Option A — personal access token

1. In GitHub, open **Settings → Developer settings** and create a token (classic or fine-grained).
2. Grant the scopes your workbench needs — for example `repo` for repository and pull request access, plus `security_events` if you want the agent to read code scanning, Dependabot, or secret scanning alerts.
3. Copy the token for the Console form.

### Option B — GitHub App

A GitHub App scopes access to only the repositories it is installed on, instead of everything the token owner can see.

1. In GitHub, go to **Settings → Developer settings → GitHub Apps** (use the organization's developer settings if the app should belong to an org) and click **New GitHub App**.
2. Set **Repository permissions** to only what the workbench needs — for example Contents, Issues, Pull requests, Metadata, and Security events for the capabilities you plan to enable. Leave the webhook disabled unless you separately rely on GitHub sending events to Plural.
3. After creation, note the numeric **App ID** at the top of the app settings page.
4. Install the app on the account or organization that owns the target repositories, then open the installation — its URL ends in a numeric installation ID (`.../installations/12345678`). Note that ID.
5. On the app page, scroll to **Private keys** and generate a key. Upload or paste that PEM file into the Console form; it is stored encrypted.

If you configure both a personal access token and a GitHub App, the GitHub App takes priority and the integration authenticates with installation tokens.

## Capabilities

The **Toolset** field controls which group of operations are registered for the agent. Choose **All** to register every operation below, or narrow the tool to a single group.

### Issues

* `github_list_issues` — List issues for a repository.
* `github_search_issues` — Search issues using the GitHub REST search API.
* `github_issue_read` — Read issue details, comments, labels, or sub-issues.
* `github_add_issue_comment` — Add a comment to an issue.
* `github_update_comment` — Edit an existing issue comment, inline pull request review comment, or review summary.

### Pull requests

* `github_list_pull_requests` — List pull requests.
* `github_search_pull_requests` — Search pull requests using the GitHub REST search API.
* `github_pull_request_read` — Read pull request details, diff, checks, files, or comments.
* `github_pull_request_review_write` — Create, submit, or delete a pull request review.
* `github_add_comment_to_pending_review` — Create or extend a pending pull request review with a new comment.
* `github_add_reply_to_pull_request_comment` — Reply to an inline pull request comment.
* `github_update_comment` — Edit an existing issue comment, inline pull request review comment, or review summary.
* `github_add_reaction_to_pull_request_comment` / `github_remove_reaction_from_pull_request_comment` — Add or remove an emoji reaction on an issue comment, pull request review comment, or commit comment.
* `github_close_pull_request` — Close an open pull request without merging it.

### Repos

* `github_list_branches` — List branches.
* `github_list_tags` / `github_get_tag` — List tags, or get a single git tag ref.
* `github_list_releases` / `github_get_latest_release` / `github_get_release_by_tag` — List releases, get the latest release, or get a release by tag.
* `github_search_repositories` — Search repositories.

### Security

* `github_list_code_scanning_alerts` / `github_get_code_scanning_alert` — List or get code scanning alerts for a repository.
* `github_list_dependabot_alerts` / `github_get_dependabot_alert` — List or get Dependabot dependency vulnerability alerts for a repository.
* `github_list_secret_scanning_alerts` / `github_get_secret_scanning_alert` — List or get secret scanning alerts for a repository.

Every call is made as the configured token or app installation, so the agent can only reach what that identity (or, for a GitHub App, that installation's repository permissions) is authorized to see and change.

## Create the GitHub tool

1. In Plural Console, open **Workbenches → Integrations**.
2. Find the **GitHub** card and click **Add tool**.

On the **Configuration** step, enter:

* **API URL** — Optional. Defaults to `https://api.github.com/`. Set this to your GitHub Enterprise Server API root instead.
* **Access token** — Optional if you configure GitHub App credentials. Leave blank when editing if the token is unchanged.
* **Toolset** — Optional. Restrict which tool group is registered (Issues, Pull requests, Repos, or Security), or leave it on **All**.
* Under **GitHub App authentication**, optionally set **App ID**, **Installation ID**, and upload the **App private key (PEM)**.

Click **Next**.

### Configure access

On the **Access policy** step, add the users or groups that should have read or write access to this configured tool:

* **Read permissions** control who can access and attach the tool to a workbench.
* **Write permissions** control who can modify the tool configuration and access policy.

Click **Save**. The connection is now available under **Workbenches → Configured Tools**.

## Attach GitHub to a workbench

You can attach the tool while creating a workbench or add it to an existing one. See [Workbench tools](/plural-features/workbenches/integrations/tools#attaching-tools-to-a-workbench) for the attachment steps, which are the same for every tool type.

## Using it from a workbench

Open the workbench's **Launch** tab and describe what you want the agent to do with GitHub. Include the owner, repository, and any issue or pull request number the agent needs. Try prompts such as:

* `List open pull requests in octocat/example that haven't been updated in 7 days and summarize what each is waiting on.`
* `Read pull request 482 in octocat/example, summarize the diff, and reply to any unresolved review comments that look like simple typos.`
* `List open Dependabot alerts for octocat/example and tell me which ones affect a package used in production.`

## Troubleshooting

### Authentication or permission errors

* For a `401` or `403` response, confirm the personal access token has the scopes the requested operation needs, or that the GitHub App's repository permissions cover it.
* If both a token and GitHub App are configured, remember the GitHub App takes priority — remove the app fields if you intend to authenticate with the token alone.
* For GitHub Enterprise Server, confirm **API URL** points at the instance's API root rather than its web URL.

### A call fails or returns unexpected data

* Confirm the **Toolset** field is not scoped to a group that excludes the operation the agent is trying to call.
* Check that the installation (for a GitHub App) is actually installed on the target owner or organization, not just created.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
