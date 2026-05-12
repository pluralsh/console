# Datadog tool setup

Use this guide to fill `Site`, `API key`, and optional `Application key`.

## 1) Create keys

1. In Datadog, go to **Organization Settings -> API Keys** and create an API key.
2. Go to **Organization Settings -> Application Keys** and create an app key.
3. Set the app key scopes for least privilege:
   - `metrics_read`
   - `logs_read_data`
   - `apm_read` (if you want trace/APM access)

## 2) Fill the Workbench tool form

- `Site`: your Datadog site (for example `datadoghq.com` or `us3.datadoghq.com`)
- `API key`: the API key value
- `Application key`: optional, but recommended for scoped read access

## 3) Recommended role posture

- Use a dedicated service account for this integration.
- Keep scopes read-only unless you explicitly need write behavior.
