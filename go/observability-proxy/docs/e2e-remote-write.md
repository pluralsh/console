# E2E Remote Write

Prometheus can be used as a disposable sender to validate ingest through
`observability-proxy` with mocked Console.

Prerequisite:

- `mock-console` is running and configured with your VM/Elastic upstreams.

Set credentials from `GetObservabilityConfig`:

```bash
export PROM_REMOTE_WRITE_USERNAME='<prom_username>'
export PROM_REMOTE_WRITE_PASSWORD='<prom_password>'
```

Start sender:

```bash
docker compose up prom-remote-write
```

Sender behavior:

- Scrapes itself (`job=self`)
- Remote writes to `http://host.docker.internal:8080/ext/v1/ingest/prometheus`
- Uses `PROM_REMOTE_WRITE_USERNAME` / `PROM_REMOTE_WRITE_PASSWORD`
- Uses a small default queue batch to minimize request body size

Optional env overrides:

- `PROM_REMOTE_WRITE_MAX_SAMPLES_PER_SEND` (default `100`)
- `PROM_REMOTE_WRITE_BATCH_SEND_DEADLINE` (default `1s`)
- `PROM_REMOTE_WRITE_MIN_SHARDS` (default `1`)
- `PROM_REMOTE_WRITE_MAX_SHARDS` (default `1`)
- `PROM_REMOTE_WRITE_CAPACITY` (default `200`)

Query through proxy:

```bash
curl -u "$PROM_REMOTE_WRITE_USERNAME:$PROM_REMOTE_WRITE_PASSWORD" \
  "http://localhost:8080/ext/v1/query/prometheus/api/v1/query?query=up{job=\"self\"}"
```
