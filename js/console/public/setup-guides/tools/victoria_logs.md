# VictoriaLogs tool setup

Use this guide to fill `URL` plus optional auth and tenant fields (`Username`, `Password`, `Account ID`, `Project ID`, `Bearer token / API key`).

## 1) Prepare VictoriaLogs query access

VictoriaLogs query APIs live under `/select/logsql/*` and use LogsQL, not Loki LogQL. Typical auth is:
- Basic auth at a gateway/proxy (vmauth, nginx, etc.)
- Bearer token auth
- Tenant routing via `AccountID` and `ProjectID` request headers (default `0:0`)

## 2) Create least-privilege credentials

- Create an integration account/token with query/read access only.
- If the cluster is multi-tenant, scope the tool to the needed AccountID/ProjectID pair.

## 3) Fill the Workbench tool form

- `URL`: VictoriaLogs query base URL, for example `http://victoria-logs:9428`
- `Username` / `Password`: optional basic auth
- `Account ID` / `Project ID`: set when querying a non-default tenant
- `Bearer token / API key`: optional token auth

Queries sent by this tool are LogsQL, for example `error`, `{app="nginx"} "timeout"`, or `status:>=500`.
