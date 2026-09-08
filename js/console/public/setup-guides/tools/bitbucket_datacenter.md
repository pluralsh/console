# Bitbucket Data Center workbench tool setup

This integration calls the **Bitbucket Data Center REST API** under the path you configure (for example `.../rest/api/latest`). Authentication uses **HTTP Basic** with username `x-token-auth` and your token as the password (a common pattern for personal or HTTP access tokens on Atlassian Server/Data Center products).

Registered tools cover **pull requests**, **repository issues** (when the issue tracker is enabled), **comments**, and **comment reactions** (Data Center comment-likes API).

## Form fields

- **REST API base URL** — Required. Example: `https://bitbucket.example.com/rest/api/1.0` or `.../rest/api/latest`. The product accepts an explicit API version segment or appends `/rest/api/latest` when you supply only the site root (prefer including `/rest/api/...` so the version is obvious to operators).
- **HTTP access token** — A user’s [HTTP access token](https://confluence.atlassian.com/bitbucketserver/http-access-tokens-939515499.html) or other PAT-style credential Bitbucket accepts for REST (stored encrypted). Create tokens from the Bitbucket **profile / personal settings** area for HTTP access tokens, and assign **only** the project/repository permissions required.

## Creating an HTTP access token

1. Sign in to Bitbucket Data Center.
2. Open your **profile** → **Manage account** / **Personal settings** → **HTTP access tokens** (wording varies by version).
3. Create a token, set expiry, and attach it to the **project or repositories** this workbench should access.
4. Grant the **minimum** permission level:

| Workflow | Suggested permission |
| --- | --- |
| Read pull requests, issues, and comments | At least **repository read** (and project read if your admin separates project vs repo visibility). |
| Post comments on pull requests or issues | **Repository write** (or the permission level your Bitbucket version documents for modifying pull requests and issues). |
| Add reactions to comments | Same as comment write; reactions use the comment-likes REST API and require credentials that can modify comments on the target resource. |

Exact labels (`REPO_READ`, `REPO_WRITE`, etc.) appear in the Bitbucket UI when you create the token—mirror those to the operations above. If you receive `401`/`403`, raise the token’s repository or project scope rather than using a global admin token.

## Repository identifier in tools

Tool arguments use **`PROJECT_KEY/repository_slug`** (for example `ACME/my-service`), not Bitbucket Cloud’s `workspace/slug` form.
