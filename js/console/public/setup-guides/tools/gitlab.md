# GitLab workbench tool setup

This integration calls the **GitLab HTTP API v4** with a `PRIVATE-TOKEN` header. Registered tools cover **merge requests**, **issues**, **notes (comments)**, and **award emoji** on notes.

## Form fields

- **API URL** — Optional. Defaults to GitLab.com (`https://gitlab.com`). For self-managed GitLab, set the **instance base URL** (for example `https://gitlab.example.com`); the product appends `/api/v4` automatically. If you already use a full API root that ends with `/api/v4`, that value is accepted as-is.
- **Access token** — A [personal access token](https://docs.gitlab.com/user/profile/personal_access_tokens/), [project access token](https://docs.gitlab.com/user/project/settings/project_access_tokens/), or [group access token](https://docs.gitlab.com/user/group/settings/group_access_tokens/) (stored encrypted).

## Creating a token (GitLab.com or self-managed)

1. Sign in to GitLab.
2. Open **Preferences** (user menu → **Edit profile**), then **Access tokens** (path may vary slightly by version: **User Settings → Access Tokens**).
3. Add a name, optional expiry, then choose scopes (see below).
4. Create the token and copy it immediately into **Access token** on the tool form.

Fine-grained personal access tokens use a different permission model; see [Fine-grained personal access tokens](https://docs.gitlab.com/auth/tokens/fine_grained_access_tokens/) if you use those instead of classic scopes.

## Scopes vs tools

| Tools | Classic PAT scopes |
| --- | --- |
| Merge request read, issue read (including listing notes) | `read_api` |
| Create note on merge request or issue; award emoji on a note | `api` (read/write API). `read_api` alone is **not** enough for POST actions. |

**Practical guidance**

- Prefer **`read_api`** only if agents should **never** post comments or reactions.
- For the full tool surface (read + comment + emoji), use **`api`**, or configure a **project/group access token** with the minimum **read_api** / **api** (or fine-grained equivalents) on the projects the workbench should touch.

Tokens must be able to see the **projects** you reference in tool calls (project path or numeric ID). Use project-scoped tokens when you want to limit blast radius.
