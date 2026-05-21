# Sentry tool setup

Use this guide to fill `URL` (optional) and `Access token`.

## 1) Create a Sentry auth token

In Sentry:

1. Open **Settings → Developer Settings → Auth Tokens** (or create an internal integration under **Settings → Developer Settings → Custom Integrations**).
2. Create a token for a dedicated integration user or internal integration.
3. Grant access to the organization(s) and project(s) this workbench tool should query.
4. Copy and store the token immediately.

## 2) Restrict scope for least privilege

The workbench Sentry tools are read-only and call these API endpoints:

- `GET /api/0/organizations/{org}/issues/`
- `GET /api/0/organizations/{org}/issues/{issue_id}/`
- `GET /api/0/organizations/{org}/issues/{issue_id}/events/`
- `GET /api/0/organizations/{org}/issues/{issue_id}/events/latest/`
- `GET /api/0/projects/{org}/{project}/events/{event_id}/`

Recommended token scopes:

- `event:read` — list/search issues and read issue events (including stack traces)
- `project:read` — read individual project events by event ID

Do not grant write or admin scopes unless you explicitly need them elsewhere.

## 3) Fill the Workbench tool form

- `URL`: leave blank for Sentry SaaS (`https://sentry.io`), or set your self-hosted Sentry base URL
- `Access token`: the auth token value with the scopes above
