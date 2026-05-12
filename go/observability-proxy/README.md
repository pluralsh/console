# observability-proxy

`observability-proxy` is a microservice that stands between observability clients and
Plural’s upstream observability backends.

Purpose:

- Expose stable ingest/query HTTP endpoints for Prometheus and Elastic traffic.
- Resolve backend routing dynamically from Console configuration.
- Keep credentials and backend host knowledge out of clients.
- Report aggregate request-byte usage back to Console through `MeterMetrics`.

Design intent:

- Small runtime surface area and predictable behavior.
- Configuration-driven upstream routing (not hardcoded backend wiring in clients).
- Operational visibility through structured klog levels.

## Documentation

- [API endpoints](docs/endpoints.md)
- [Configuration](docs/configuration.md)
- [Local development and docker-compose](docs/development.md)
- [E2E remote_write flow](docs/e2e-remote-write.md)
- [E2E Elastic bulk write flow](docs/e2e-elastic.md)
- [Metering behavior](docs/metering.md)
- [Logging policy](docs/logging.md)
