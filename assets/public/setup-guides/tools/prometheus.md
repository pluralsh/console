# Prometheus tool setup

Use this guide to fill `URL` plus optional auth fields (`Username`, `Password`, `Tenant ID`, `Bearer token / API key`).

## 1) Choose auth method

Prometheus-compatible APIs typically use one of:
- Basic auth username/password
- Bearer token in `Authorization` header

If your backend is multi-tenant (Mimir/Cortex), you may also need tenant routing.

## 2) Prepare read-only access

- Create a dedicated integration identity.
- Grant query-only/read-only access in your gateway or proxy layer.
- Avoid write/admin endpoints.

## 3) Fill the Workbench tool form

- `URL`: Prometheus query endpoint base URL
- `Username` / `Password`: if basic auth is enabled
- `Tenant ID`: optional for multi-tenant systems
- `Bearer token / API key`: optional alternative auth
