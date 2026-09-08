# Bitbucket Cloud workbench tool setup

This integration calls the **Bitbucket Cloud 2.0 REST API** (`api.bitbucket.org/2.0`) with a **Bearer** token. Registered tools cover **pull requests**, **repository issues** (when the issue tracker is enabled), **comments**, and a **react-to-comment** helper that returns an explicit “unsupported on Cloud” response (Bitbucket Cloud does not document the same reaction endpoints as Data Center).

## Form fields

- **API URL** — Optional. Defaults to `https://api.bitbucket.org/2.0`. Override only if Atlassian documents a different API root for your account or product tier.
- **App password or access token** — Use a [Bitbucket Cloud API token](https://support.atlassian.com/bitbucket-cloud/docs/api-tokens/) (recommended) or a legacy [app password](https://support.atlassian.com/bitbucket-cloud/docs/app-passwords/) (stored encrypted). API tokens use granular OAuth-style scopes; app passwords use permission checkboxes.

## Creating credentials

### API token (recommended)

1. In Bitbucket Cloud, open **Personal settings** → **API tokens** (or **Atlassian account** → **Security** → **API tokens**, depending on navigation).
2. Create a token with an expiry and the **minimum repository / pull request / issue** permissions you need (see below).
3. Copy the token into **App password or access token** on the form.

### App password (legacy)

1. **Personal settings** → **App passwords** → **Create app password**.
2. Grant the permissions listed below.
3. Copy the generated password into the form.

See Atlassian’s [API token permissions](https://support.atlassian.com/bitbucket-cloud/docs/api-token-permissions/) and [REST API scopes](https://developer.atlassian.com/cloud/bitbucket/bitbucket-cloud-rest-api-scopes/) for the authoritative scope names available in your UI.

## Scopes / permissions vs tools

Repository, pull request, and issue permissions are **not fully implied by each other**—grant the combinations you actually use.

| Capability | Typical API token / app password needs |
| --- | --- |
| Read pull requests and comments | Pull requests **read** (e.g. `read:pullrequest:bitbucket`); add **repository read** if your calls need repository-level endpoints. |
| Post comments on pull requests | Pull requests **write** (e.g. `write:pullrequest:bitbucket`). |
| Read issues and comments | **Issue read** / `issue` scope (naming differs between API tokens and app passwords—match the UI). |
| Post comments on issues | **Issue write** where offered, or the permission set Atlassian documents for creating issue comments. |

Start with the **smallest** set that covers your repositories, then expand if the API returns `401`/`403`.
