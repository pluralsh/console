# Development

## Local commands

```bash
make proto
make test
make run
```

## Docker compose (mock-console + real VM/Elastic)

Recommended setup is to run `mock-console` and point it at real VM/Elastic
endpoints.

Set upstreams:

```bash
export MOCK_PROMETHEUS_HOST='https://<vm-host>/select/<tenant>/prometheus'
export MOCK_ELASTIC_HOST='https://<elastic-host>'
```

Start compose:

```bash
make docker-compose
```

This starts:

- `mock-console` gRPC server serving `GetObservabilityConfig` and `MeterMetrics`
- `observability-proxy`
- `prom-remote-write` sender posting to the proxy
- `elastic-bulk-write` sender posting to the proxy

Example requests:

```bash
curl -i http://localhost:8080/ready
curl -i -X POST http://localhost:8080/ext/v1/ingest/prometheus
curl -i http://localhost:8080/ext/v1/ingest/elastic/
curl -i http://localhost:8080/ext/v1/query/prometheus/api/v1/query?query=up
```

`make docker-compose` runs attached in the foreground. Stop with `Ctrl+C`.
