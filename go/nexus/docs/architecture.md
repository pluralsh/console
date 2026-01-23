# Architecture

Nexus is a lightweight HTTP gateway that fronts the Bifrost SDK, federates auth via Plural
Console gRPC, and routes AI traffic to provider backends.

## Components

- `cmd/main.go` boots the process, loads configuration, starts the HTTP server, and handles
  graceful shutdown.
- `internal/config` loads and validates configuration from file, env, and CLI flags.
- `internal/console` owns the gRPC client to Console and caches AI configuration.
- `internal/server` exposes HTTP endpoints, middleware, health checks, and graceful shutdown.
- `internal/middleware` provides request logging, recovery, and auth enforcement.
- `internal/bifrost` wraps the Bifrost SDK, mapping Console config into provider definitions.

## Request Flow

```
Client
  -> HTTP server (Chi router)
     -> request logger / recovery
     -> auth middleware (Console gRPC)
     -> Bifrost handler
        -> provider router (OpenAI, Anthropic)
        -> provider backend
```

### Authentication

Every AI request requires an `Authorization: Bearer <token>` header. Tokens are validated on
request by Console gRPC (`ProxyAuthentication`) with no local cache.

### Configuration Fetching

AI provider configuration is fetched from Console (`GetAiConfig`) and cached for a configurable
TTL by `internal/console`.

### Timeouts and Streaming

The server keeps `WriteTimeout` disabled to allow streaming responses. Route-level middleware
applies a 30-minute timeout to AI proxy requests and a 30-second timeout to health checks.

## Base Path Routing

`server.path` is stripped from incoming requests before routing. If you set `server.path` to
`/ai/proxy`, the externally visible endpoints become:

- `/ai/proxy/health`
- `/ai/proxy/ready`
- `/ai/proxy/*` for Bifrost provider routes
