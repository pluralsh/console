# Dynatrace tool setup

Use this guide to fill `URL` and `Platform token`.

## 1) Create a platform token

In Dynatrace, create a platform token for a dedicated integration user or service user.
A platform token only works within the permissions of the user it belongs to, so that
user also needs IAM policies that allow the same reads.

Grant only the scopes for the capabilities you enable:
- Metrics: `storage:buckets:read`, `storage:metrics:read`
- Logs: `storage:buckets:read`, `storage:logs:read`
- Traces: `storage:buckets:read`, `storage:spans:read`
- Dashboards: `document:documents:read`
- Monitors (anomaly detectors and metric events): `settings:objects:read`

## 2) Keep permissions minimal

- Grant only read scopes needed by this tool.
- Avoid write/admin scopes unless explicitly required.

## 3) Fill the Workbench tool form

- `URL`: Dynatrace platform environment URL (for example `https://{environment-id}.apps.dynatrace.com`)
- `Platform token`: token value with the scopes above
