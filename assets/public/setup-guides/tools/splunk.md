# Splunk tool setup

Use this guide to fill `URL` and either `Bearer token` or `Username` + `Password`.

## 1) Create read-only access for searches

Create a dedicated Splunk role/user with read/search capabilities only.

Common capabilities for API search access:
- `search`
- `rest_properties_get`

Also grant access only to the indexes this tool should query.

## 2) Choose auth method

- Token auth (recommended): create an auth token for the integration user.
- Basic auth: use dedicated service username/password.

## 3) Fill the Workbench tool form

- `URL`: Splunk management/query endpoint base URL
- Option A: `Bearer token`
- Option B: `Username` + `Password`
