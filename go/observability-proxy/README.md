# observability-proxy

Lightweight HTTP proxy that offloads observability ingest/query traffic from Console.

## Endpoints

- `POST /ext/v1/ingest/prometheus`
- `GET /ext/v1/ingest/elastic/`
- `GET /ext/v1/ingest/elastic/_license`
- `POST /ext/v1/ingest/elastic/_bulk`
- `* /ext/v1/query/prometheus/*`
- `GET /health`
- `GET /ready`

## Configuration

Flags and environment variables:

- `--listen-addr` / `OBS_PROXY_LISTEN_ADDR`
- `--console-grpc-endpoint` / `OBS_PROXY_CONSOLE_GRPC_ENDPOINT`
- `--config-ttl` / `OBS_PROXY_CONFIG_TTL`
- `--grpc-timeout` / `OBS_PROXY_GRPC_TIMEOUT`
- `--upstream-timeout` / `OBS_PROXY_UPSTREAM_TIMEOUT`
- `--query-rps` / `OBS_PROXY_QUERY_RPS`
- `--query-burst` / `OBS_PROXY_QUERY_BURST`

## Logging

Detailed logging guidelines are in [docs/logging.md](docs/logging.md).

## Local development

```bash
make proto
make test
make run
```

## Docker compose integration testbed

```bash
make up-docker
```

This starts:

- `mock-console` gRPC server serving `GetObservabilityConfig`
- `mock-prometheus` HTTP echo upstream
- `mock-elastic` HTTP echo upstream
- `observability-proxy`

`mock-console` supports compose-overridable env vars:
- `MOCK_CONSOLE_ADDR` (default `:50051`)
- `MOCK_PROMETHEUS_HOST` (default `http://mock-prometheus:19090/select/default/prometheus`)
- `MOCK_ELASTIC_HOST` (default `http://mock-elastic:19200`)

Example requests:

```bash
curl -i http://localhost:8080/ready
curl -i -X POST http://localhost:8080/ext/v1/ingest/prometheus
curl -i http://localhost:8080/ext/v1/ingest/elastic/
curl -i http://localhost:8080/ext/v1/query/prometheus/api/v1/query?query=up
```

## Real E2E remote_write test (Prometheus -> local proxy)

If you run `observability-proxy` locally against real Console gRPC + VM port-forwards,
you can start a disposable Prometheus sender via compose profile `e2e-real`.

Set credentials from `GetObservabilityConfig`:

```bash
export PROM_REMOTE_WRITE_USERNAME='<prom_username>'
export PROM_REMOTE_WRITE_PASSWORD='<prom_password>'
```

Start Prometheus sender:

```bash
docker compose --profile e2e-real up prom-remote-write
```

This service:

- scrapes itself (`job=self`)
- remote_writes to `http://host.docker.internal:8080/ext/v1/ingest/prometheus`
- uses `PROM_REMOTE_WRITE_USERNAME` / `PROM_REMOTE_WRITE_PASSWORD`

You can then query through your local proxy:

```bash
curl -u "$PROM_REMOTE_WRITE_USERNAME:$PROM_REMOTE_WRITE_PASSWORD" \
  "http://localhost:8080/ext/v1/query/prometheus/api/v1/query?query=up{job=\"self\"}"
```
