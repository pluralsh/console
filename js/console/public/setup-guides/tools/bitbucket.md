# Bitbucket Cloud workbench tool setup

This integration calls the **Bitbucket Cloud 2.0 REST API** (`api.bitbucket.org/2.0`) with a **Bearer** token. Registered tools cover reading **pull requests** and **repository issues** (when the issue tracker is enabled) with their comments, creating and editing **comments**, **declining pull requests**, and a **react-to-comment** helper that returns an explicit “unsupported on Cloud” response (Bitbucket Cloud does not document the same reaction endpoints as Data Center).

## Form fields

- **API URL** — Optional. Defaults to `https://api.bitbucket.org/2.0`. Override only if Atlassian documents a different API root for your account or product tier.
- **App password or access token** — Use a [Bitbucket Cloud API token](https://support.atlassian.com/bitbucket-cloud/docs/using-api-tokens/) or a repository, project, or workspace [access token](https://support.atlassian.com/bitbucket-cloud/docs/using-access-tokens/) (stored encrypted). **Do not use an app password**: the token is sent as `Authorization: Bearer <token>` with no username or email, which Bitbucket documents for API tokens and access tokens. App passwords have been replaced by API tokens.

## Creating credentials

### API token (recommended)

1. In Bitbucket Cloud, select your profile (upper right) → **Account settings**.
2. On the Atlassian Account page, open **Security** → **Create and manage API tokens**.
3. Select **Create API token with scopes**, enter a name and expiry, select **Bitbucket** as the app, and choose the scopes below.
4. Copy the token into **App password or access token** on the form. It is shown only once.

### Access token (repository, project, or workspace)

To limit the agent to one repository, project, or workspace, create an access token in that resource’s settings with the equivalent permissions below.

See Atlassian’s [API token permissions](https://support.atlassian.com/bitbucket-cloud/docs/api-token-permissions/) for the authoritative scope definitions.

## Scopes vs tools

Repository, pull request, and issue scopes are **not implied by each other**—a repository scope does not grant pull request access.

| Tools | API token scopes |
| --- | --- |
| Read pull requests and comments; create or edit pull request comments | `read:pullrequest:bitbucket` (pull request read includes commenting) |
| Decline a pull request (`close_pull_request`) | `read:pullrequest:bitbucket` + `write:pullrequest:bitbucket` |
| Read issues and comments | `read:issue:bitbucket` |
| Create or edit issue comments | Not documented in Bitbucket’s current REST reference; add `write:issue:bitbucket` if `read:issue:bitbucket` returns `403`. |

The tool has no read-only mode: the token’s scopes are what limit the agent. Start with the **smallest** set that covers your repositories, then expand if the API returns `403`.
