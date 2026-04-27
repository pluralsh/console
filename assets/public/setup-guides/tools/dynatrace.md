# Dynatrace tool setup

Use this guide to fill `URL` and `Platform token`.

## 1) Create an access token

In Dynatrace, create an API/platform token for a dedicated integration user.

Recommended read scopes:
- `metrics.read`
- `logs.read` (or Grail storage read scopes when using Grail-based log APIs)
- `traces.read` / trace lookup scope based on your deployment API

## 2) Keep permissions minimal

- Grant only read scopes needed by this tool.
- Avoid write/admin scopes unless explicitly required.

## 3) Fill the Workbench tool form

- `URL`: Dynatrace environment URL (for example `https://{tenant}.live.dynatrace.com`)
- `Platform token`: token value with read scopes
