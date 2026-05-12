# E2E Elastic Bulk Write

Use a disposable writer container to validate Elastic ingest through
`observability-proxy` (`/ext/v1/ingest/elastic/_bulk`) with mocked Console.

Prerequisite:

- `mock-console` is running and configured with your real Elastic upstream host.

Set credentials from `GetObservabilityConfig`:

```bash
export ELASTIC_WRITE_USERNAME='<elastic_username>'
export ELASTIC_WRITE_PASSWORD='<elastic_password>'
```

Start writer:

```bash
docker compose up elastic-bulk-write
```

Default behavior:

- Writes NDJSON `_bulk` requests to `http://host.docker.internal:8080/ext/v1/ingest/elastic/_bulk`
- Uses index `obs_proxy_smoketest`
- Sends `10` docs per bulk request
- Repeats every `5` seconds

Optional env overrides:

- `ELASTIC_PROXY_BULK_URL` (default `http://host.docker.internal:8080/ext/v1/ingest/elastic/_bulk`)
- `ELASTIC_WRITE_INDEX` (default `obs_proxy_smoketest`)
- `ELASTIC_WRITE_INTERVAL_SECONDS` (default `5`)
- `ELASTIC_WRITE_BATCH_SIZE` (default `10`)
- `ELASTIC_WRITE_USERNAME`
- `ELASTIC_WRITE_PASSWORD`
