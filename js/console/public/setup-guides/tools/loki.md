# Loki tool setup

Use this guide to fill `URL` plus optional auth fields (`Username`, `Password`, `Tenant ID`, `Bearer token / API key`).

## 1) Prepare Loki query access

Loki commonly uses:
- Basic auth at the gateway/proxy
- Bearer token auth
- Tenant routing (for example `X-Scope-OrgID`)

## 2) Create least-privilege credentials

- Create an integration account/token with query/read access only.
- Scope access to the tenant and log data required for this tool.

## 3) Fill the Workbench tool form

- `URL`: Loki query API base URL
- `Username` / `Password`: optional basic auth
- `Tenant ID`: set when your deployment requires tenant separation
- `Bearer token / API key`: optional token auth
