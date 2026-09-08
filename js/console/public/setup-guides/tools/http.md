# Custom HTTP tool setup

Use this guide to fill `URL`, `Method`, optional `Headers`/`Body`, and `Input schema`.

## 1) Identify target API authentication

The Custom HTTP tool can call any HTTPS endpoint. Use the target API's auth model:
- Bearer token (`Authorization: Bearer ...`)
- Basic auth (`Authorization: Basic ...`)
- API key header (`x-api-key: ...`)

## 2) Use least-privilege credentials

- Create credentials for a dedicated integration account.
- Prefer read-only API roles/scopes where available.
- Restrict endpoint and resource access to only what the tool needs.

## 3) Fill the Workbench tool form

- `URL`: full endpoint URL
- `Method`: usually `GET` for read-only access
- `Headers`: add required auth headers and content type
- `Body`: optional request body
- `Input schema`: JSON schema describing user-supplied tool inputs
