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

Detailed logging guidelines are in [docs/logging.md](/home/floreks/projects/plural/console/go/observability-proxy/docs/logging.md).

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

Example requests:

```bash
curl -i http://localhost:8080/ready
curl -i -X POST http://localhost:8080/ext/v1/ingest/prometheus
curl -i http://localhost:8080/ext/v1/ingest/elastic/
curl -i http://localhost:8080/ext/v1/query/prometheus/api/v1/query?query=up
```
