# Elasticsearch tool setup

Use this guide to fill `URL`, `Index`, `Username`, and `Password`.

## 1) Create a read-only role

Create an Elasticsearch role scoped to the indices this tool should query.

Recommended index privileges:
- `read`
- `view_index_metadata`

Optional cluster privilege:
- `monitor` (if your deployment requires cluster metadata access)

## 2) Create a service user

Create a dedicated user and assign the role above. Save username/password.

## 3) Fill the Workbench tool form

- `URL`: Elasticsearch base URL
- `Index`: index name or pattern (example `logs-*`)
- `Username`: service user username
- `Password`: service user password
