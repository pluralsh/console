# Prometheus tool setup

Use this guide to fill `URL` plus optional auth fields (`Username`, `Password`, `Tenant ID`, `Bearer token / API key`), or the AWS SigV4 fields for Amazon Managed Service for Prometheus.

## 1) Choose auth method

Prometheus-compatible APIs typically use one of:
- Basic auth username/password
- Bearer token in `Authorization` header
- AWS SigV4 request signing (Amazon Managed Service for Prometheus)

If your backend is multi-tenant (Mimir/Cortex), you may also need tenant routing. `Tenant ID` is sent as the `X-Scope-OrgID` header.

## 2) Prepare read-only access

- Create a dedicated integration identity.
- Grant query-only/read-only access in your gateway or proxy layer.
- Avoid write/admin endpoints.

For Amazon Managed Service for Prometheus, grant the signing IAM identity:
- `aps:QueryMetrics` for PromQL range queries
- `aps:GetLabels` for metric name, label name, and label value discovery

The AWS managed policy `AmazonPrometheusQueryAccess` includes both.

## 3) Fill the Workbench tool form

- `URL`: Prometheus query endpoint base URL, without `/api/v1` (for Amazon Managed Service for Prometheus: `https://aps-workspaces.<region>.amazonaws.com/workspaces/<workspace-id>`)
- `Username` / `Password`: if basic auth is enabled
- `Tenant ID`: optional for multi-tenant systems
- `Bearer token / API key`: optional alternative auth

For Amazon Managed Service for Prometheus:
- Enable `Sign requests with AWS SigV4`. Leave `Username`, `Password`, and `Bearer token / API key` empty; the SigV4 signature replaces the `Authorization` header.
- `AWS region`: workspace region, for example `us-east-1`. Required unless the Console runtime's AWS credential chain provides a region.
- `Access key ID` / `Secret access key`: provide both for static credentials, or leave both blank to use IRSA, EKS Pod Identity, or another AWS credential source available to the Console runtime.
