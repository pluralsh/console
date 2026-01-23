# Configuration

Nexus configuration is loaded in this order (highest precedence first):

1. CLI flags
2. Environment variables
3. Config file
4. Defaults

## Config File

The default config file location is `config/config.yaml` if it exists. The file can be YAML or
JSON and follows the `internal/config.Config` schema.

Example (from `config/config.yaml`):

```yaml
server:
  address: ":8080"
  path: "/ai/proxy"
  readTimeout: "30s"
  idleTimeout: "120s"

console:
  grpcEndpoint: "localhost:55510"
  configTTL: "60s"
  requestTimeout: "10s"
  connectionRetry:
    maxAttempts: 5
    initialBackoff: "1s"
    maxBackoff: "30s"

observability:
  logLevel: "debug"
```

## CLI Flags

- `--config` Path to a config file (YAML/JSON)
- `--server-address` HTTP bind address (e.g. `:8080`)
- `--server-path` Base path for HTTP routes (e.g. `/ai/proxy`)
- `--server-read-timeout` Read timeout (e.g. `30s`)
- `--server-idle-timeout` Idle timeout (e.g. `120s`)
- `--console-endpoint` Console gRPC endpoint (`host:port`)
- `--console-config-ttl` Config cache TTL (e.g. `60s`)
- `--console-request-timeout` gRPC request timeout (e.g. `10s`)
- `--log-level` Log level (`debug`, `info`, `warn`, `error`)
- `--version` Print version and exit

## Environment Variables

Environment variables use the `NEXUS_` prefix with underscore-separated paths. Supported values
include:

- `NEXUS_SERVER_ADDRESS`
- `NEXUS_SERVER_PATH`
- `NEXUS_CONSOLE_GRPCENDPOINT`
- `NEXUS_OBSERVABILITY_LOGLEVEL`
- `NEXUS_CONSOLE_REQUESTTIMEOUT`
- `NEXUS_CONSOLE_CONNECTIONRETRY_INITIALBACKOFF`
- `NEXUS_CONSOLE_CONNECTIONRETRY_MAXBACKOFF`
- `NEXUS_CONSOLE_CONFIGPOLLINTERVAL`

Note: `NEXUS_CONSOLE_CONFIGPOLLINTERVAL` maps to `console.configTTL` in the config file. This is
the key currently wired in `internal/config/loader.go`.

## Validation Rules

`internal/config/validator.go` enforces:

- `server.address` must be `:port` or `host:port`
- `console.grpcEndpoint` must be `host:port`
- `console.configTTL` must be positive and at least 10 seconds
- `console.requestTimeout` must be positive
- retry backoffs must be positive and `maxBackoff >= initialBackoff`
