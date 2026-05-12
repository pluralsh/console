# Tempo tool setup

Use this guide to fill `URL` plus optional auth fields (`Username`, `Password`, `Tenant ID`, `Bearer token / API key`).

## 1) Prepare Tempo query API access

Tempo deployments usually expose read/query endpoints behind:
- Basic auth
- Bearer token auth
- Tenant-aware routing for multi-tenant environments

## 2) Create read-only credentials

- Use a dedicated integration identity.
- Allow trace query access only; do not grant admin/write permissions.

## 3) Fill the Workbench tool form

- `URL`: Tempo query endpoint base URL
- `Username` / `Password`: optional basic auth
- `Tenant ID`: optional for multi-tenant deployments
- `Bearer token / API key`: optional token auth
