# Development

This document covers day-to-day development for Nexus.

## Prerequisites

- Go 1.25+
- Docker (optional, for container builds)
- Access to a Console gRPC endpoint

## Repo Layout

- `cmd/` - CLI entry point and flags
- `config/` - sample configuration
- `internal/bifrost/` - Bifrost SDK integration and provider routers
- `internal/config/` - configuration loading and validation
- `internal/console/` - Console gRPC client and cache
- `internal/server/` - HTTP server, routing, and health checks
- `proto/` - gRPC definitions (generated code lands under `internal/proto/`)

## Common Commands

```bash
# Generate protobuf bindings
make proto

# Run tests
make test

# Run lint
make lint

# Run the service locally
make run

# Build a binary
make build
```

## Local Run Notes

- The default config file is `config/config.yaml`.
- `make run` uses that file and sets environment variables that are convenient for local
  provider testing.
- If you need to override settings at runtime, use CLI flags (see `docs/configuration.md`).

## Adding or Modifying Providers

1. Update `internal/bifrost/account.go` to map Console config into Bifrost provider keys.
2. Add or update provider routers under `internal/bifrost/`.
3. Ensure the Console proto and server responses include the new provider config.
4. Add tests around provider selection and routing behavior.

## Debugging Tips

- Enable `observability.logLevel=debug` for request and config caching logs.
- `GET /ready` will report whether the Console gRPC connection is healthy.
