# Endpoints

The proxy exposes these HTTP endpoints:

- `POST /ext/v1/ingest/prometheus`
- `GET /ext/v1/ingest/elastic/`
- `GET /ext/v1/ingest/elastic/_license`
- `POST /ext/v1/ingest/elastic/_bulk`
- `POST /ext/v1/ingest/loki/api/v1/push`
- `* /ext/v1/query/prometheus/*`
- `GET /health`
- `GET /ready`

Notes:

- `/health` returns `200` when the process is alive.
- `/ready` returns `200` only after observability config has been loaded from Console. A background poller retries failed initial loads and refreshes the config at the configured cache TTL; neither probe performs configuration I/O.
- When a Loki host is configured, Elasticsearch bulk requests are translated to its
  `/elasticsearch/_bulk` compatibility endpoint. Loki push requests are translated
  to `/loki/api/v1/push`. The configured Loki host must be the namespace-scoped
  write URL, for example `https://logs.example.com/logs/write/ns/my-tenant`.
- When a Loki host is configured without an Elasticsearch host, the proxy serves
  local Elasticsearch-compatible responses for `GET /ext/v1/ingest/elastic/`
  and `GET /ext/v1/ingest/elastic/_license` so Logstash can initialize.
