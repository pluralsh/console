# Jaeger tool setup

Use this guide to fill `URL` plus optional auth fields (`Username`, `Password`, `Bearer token`).

## 1) Expose Jaeger query endpoint

Point this tool at your Jaeger query API URL (for example a `jaeger-query` service or ingress).

## 2) Create least-privilege access

- Prefer a dedicated service account or gateway token.
- Grant trace query/read access only.
- Use HTTPS and gateway auth where possible.

## 3) Fill the Workbench tool form

- `URL`: Jaeger query base URL
- `Username` / `Password`: optional basic auth
- `Bearer token`: optional token auth
