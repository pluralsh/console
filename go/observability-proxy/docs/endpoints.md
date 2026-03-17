# Endpoints

The proxy exposes these HTTP endpoints:

- `POST /ext/v1/ingest/prometheus`
- `GET /ext/v1/ingest/elastic/`
- `GET /ext/v1/ingest/elastic/_license`
- `POST /ext/v1/ingest/elastic/_bulk`
- `* /ext/v1/query/prometheus/*`
- `GET /health`
- `GET /ready`

Notes:

- `/health` returns `200` when the process is alive.
- `/ready` returns `200` only after observability config has been loaded from Console.
