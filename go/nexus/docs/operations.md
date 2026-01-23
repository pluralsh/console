# Operations

This document covers runtime behavior and operational notes for Nexus.

## Health and Readiness

- `GET /health` returns `{ "status": "ok" }`.
- `GET /ready` reports Console gRPC connectivity and returns 503 if Console is disconnected.

If `server.path` is configured, these endpoints are served under that base path. For example,
`server.path=/ai/proxy` exposes `/ai/proxy/health` and `/ai/proxy/ready`.

## Logging

Nexus uses zap logging. Configure verbosity via `observability.logLevel` or `--log-level`.
Request logs are emitted by `internal/middleware/request_logger.go`.

## Timeouts and Streaming

- Read timeouts and idle timeouts are configurable via `server.readTimeout` and
  `server.idleTimeout`.
- Write timeout is intentionally disabled to support streaming responses.
- AI proxy routes apply a 30-minute request timeout.

## Shutdown

The process listens for `SIGTERM`/`SIGINT` and performs a graceful HTTP shutdown with a
30-second deadline. Bifrost is shut down after the HTTP server stops accepting requests.

## Docker

```bash
make docker-build

docker run -p 8080:8080 \
  -e NEXUS_CONSOLE_GRPCENDPOINT=console:9090 \
  ghcr.io/pluralsh/nexus:latest
```
