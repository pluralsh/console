# Nexus

A standalone Bifrost-based Nexus service for Plural Console that federates authentication and dynamically configures
LLM providers.

---

## Overview

Nexus enables secure, centralized AI access for coding agents by:

- **Federating authentication** to Plural Console via gRPC
- **Dynamically configuring** LLM providers based on Console settings
- **Proxying requests** to multiple providers (OpenAI, Anthropic)

## Documentation

- `docs/README.md` - docs index and navigation
- `docs/architecture.md` - component overview and request flows
- `docs/development.md` - local workflow, tests, and repo layout
- `docs/configuration.md` - config file, env vars, CLI flags, and precedence
- `docs/operations.md` - runtime behavior, health checks, and deployment notes

## Quick Start

### Prerequisites

- Go 1.25+
- Docker (for containerized deployment)
- Console gRPC endpoint accessible

### Development

```bash
# Clone repository
git clone https://github.com/pluralsh/console.git
cd console/go/nexus

# Install dependencies
go mod download

# Generate protobuf code
make proto

# Run tests
make test

# Run locally
go run cmd/main.go serve --config config/config.yaml
```

### Docker

```bash
# Build image
make docker-build

# Run container
docker run -p 8080:8080 \
  -e CONSOLE_GRPC_ENDPOINT=console:9090 \
  ghcr.io/pluralsh/nexus:latest
```

## References

- [Bifrost](https://github.com/maximhq/bifrost) - LLM gateway
- [Plural Documentation](https://docs.plural.sh)
