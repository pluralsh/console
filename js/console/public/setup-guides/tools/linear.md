# Linear tool setup

Use this guide to fill `Access token`. Workbench connects to Linear's hosted MCP server (`https://mcp.linear.app/mcp`) and sends the key as `Authorization: Bearer <key>`; the agent gets the tools that server exposes.

## 1) Create a Linear API key

Admins can always create API keys. Members can only create them if an admin has enabled **Settings -> Administration -> API -> Member API keys**.

In Linear:
1. Open **Settings -> Account -> Security & Access**.
2. Create a personal API key.
3. Copy and store the key immediately.

## 2) Restrict scope for least privilege

- Choose the key's permissions: full access, or a subset of **Read**, **Write**, **Admin**, **Create issues**, and **Create comments**. A **Read**-only key gives the agent read-only access.
- Limit the key to the teams the workbench needs.
- Use a dedicated integration account instead of a personal admin account; the key acts as the user who created it.

## 3) Fill the Workbench tool form

- `Access token`: the Linear API key value
