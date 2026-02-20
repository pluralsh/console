# Command-Line Arguments Reference

This document provides a comprehensive reference for all command-line arguments available in the Cloud-Query service.

## Usage

```bash
cloud-query [flags]
```

## Available Arguments

| Argument | Default Value | Description                                                                                       |
|----------|---------------|---------------------------------------------------------------------------------------------------|
| `--database-enabled` | `true` | Enable PostgreSQL-backed CloudQuery features (disables CloudQuery service when false)             |
| `--database-host` | `localhost` | Host of the PostgreSQL database                                                                   |
| `--database-port` | `5432` | Port of the PostgreSQL database                                                                   |
| `--database-user` | `postgres` | Username for the PostgreSQL database                                                              |
| `--database-password` | `postgres` | Password for the PostgreSQL database                         |
| `--database-name` | `postgres` | Database name for the PostgreSQL database                                                         |
| `--connection-ttl` | `3h` | Default TTL for connections in the pool, connections will be closed after this duration if not used |
| `--server-address` | `:9192` | Address on which the gRPC server will listen                                                      |
| `--server-tls-cert` | `""` | Path to the TLS certificate file for the gRPC server                                              |
| `--server-tls-key` | `""` | Path to the TLS key file for the gRPC server                                                      |
| `--server-enable-reflection` | `false` | Enable gRPC reflection for the server, useful for debugging and introspection                     |
| `-v` | Varies | Log level verbosity (0-5)                                                                         |

## Environment Variables

Some defaults can be configured via environment variables:

| Variable                | Description |
|-------------------------|-------------|
| `PLRL_DATABASE_ENABLED` | Overrides the default for `--database-enabled` |
| `PLRL_PG_PASSWORD`      | Overrides the default for `--database-password` |

## Log Levels

The Cloud-Query service uses klog for logging with the following verbosity levels:

| Level | Description |
|-------|-------------|
| 0 | Critical errors and minimal operational information |
| 1 | Important operational events |
| 2 | Normal operational events |
| 3 | Detailed operational events |
| 4 | Debug information |
| 5 | Trace information |

## Examples

### Starting the server with custom database location

```bash
cloud-query --database-host db.example.internal --database-port 5433
```

### Starting the server with TLS enabled

```bash
cloud-query --server-tls-cert /path/to/cert.pem --server-tls-key /path/to/key.pem
```

### Starting the server with increased connection pool size

```bash
cloud-query --connection-ttl 30m
```

### Starting the server without the PostgreSQL sidecar

```bash
cloud-query --database-enabled=false
```

### Starting the server with gRPC reflection enabled

```bash
cloud-query --server-enable-reflection
```

### Setting more verbose logging

```bash
cloud-query -v=3
```

## Note on Directory Paths

When specifying file paths, such as for `--server-tls-cert` and `--server-tls-key`, you should ensure that:

1. The files exist and are readable by the Cloud-Query process
2. The Cloud-Query process has permission to read the files
3. For production use, consider using absolute paths instead of relative paths
