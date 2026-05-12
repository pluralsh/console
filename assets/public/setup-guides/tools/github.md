# GitHub MCP tool setup

Use this guide to fill `URL`, `Access token`, and `Toolset`.

## 1) Create a GitHub token

In GitHub:
1. Create a token suitable for your GitHub MCP workflows.
2. Grant only the minimum permissions needed for the selected toolset.
3. Copy and store the token securely.

## 2) Fill the Workbench tool form

- `URL`: optional, defaults to `https://api.githubcopilot.com/mcp`
- `Access token`: your GitHub token for MCP authentication
- `Toolset`: optional single toolset value from the dropdown

## 3) Toolset values

The dropdown includes publicly documented GitHub MCP toolsets:

- `repos`
- `issues`
- `pull_requests`
- `actions`
- `code_security`
- `secret_protection`
- `copilot` (remote only)
- `github_support_docs_search` (remote only)
- `all`
- `default`
