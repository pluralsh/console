# Azure DevOps workbench tool setup

This integration uses the **Azure DevOps REST APIs** (Git **7.1** for pull requests and threads; Work Item Tracking **7.1** / comments **7.0-preview.3** / reactions **7.1-preview.1** where applicable). Authenticate with a **personal access token (PAT)** sent as HTTP Basic (`:PAT` encoded), which is the [documented PAT pattern](https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate) for REST.

Registered tools: **pull request read** (optional comment threads), **work item read** (optional discussion comments), **create comment** on a pull request thread or work item, **react** (PR thread **like** only; work item comment reactions for other types).

## Form fields

- **Personal access token (PAT)** — Required. Create as below (stored encrypted).
- **API URL** — Optional; defaults to `https://dev.azure.com` when unset. When the URL is bare `https://dev.azure.com`, tool calls must supply an **organization** argument, or you can bake the org into the URL (`https://dev.azure.com/{YourOrg}`). For Azure DevOps Server / TFS collections, use your on-premises collection root as documented for your deployment.

## Creating a PAT

1. Sign in to Azure DevOps (`https://dev.azure.com/{org}` or your Server URL).
2. Open **User settings** (profile menu) → **Personal access tokens** → **New Token**.
3. Set organization/collection access, expiry, and **Custom defined** scopes (recommended).
4. Copy the token into **Personal access token** on the form.

Microsoft’s UI groups scopes by area (for example **Code**, **Work Items**). If an API call fails with `401`/`403`, the REST docs for that endpoint list required scopes under **Security → Scopes**; use that to tighten or fix a PAT.

## Scopes vs tools

Use the **least** access that matches the agents’ behavior.

| Tools | Typical PAT scopes (names as in the Azure DevOps UI) |
| --- | --- |
| Read pull requests; list PR threads | **Code** — *Read* |
| Read work items; list work item comments | **Work Items** — *Read* |
| Create PR thread comments; like a PR thread comment | **Code** — *Read & write* (threads and likes are Git APIs) |
| Create work item comments; add work item comment reactions | **Work Items** — *Read & write* |

**Read-only agents** — Enable **Code (Read)** and **Work Items (Read)** only.

**Agents that comment or react** — Add **Code (Read & write)** for pull request tools and **Work Items (Read & write)** for work-item tools. You can split work across two PATs and two tools only if your deployment policy requires it; a single PAT with the union of scopes is simpler for one workbench tool.

Pull-request tools need **project** and **repository** identifiers in tool arguments; work-item tools need **project** and work item id. When using `dev.azure.com` without org in the URL, pass **organization** on each call.
