# Command-Line Arguments Reference

This document provides a comprehensive reference for all command-line arguments available in the Cloud-Query service.

## Usage

```bash
cloud-query [flags]
```

## Available Arguments

| Argument | Default Value | Description |
|----------|---------------|-------------|
| `--extensions-dir` | `./bin` | Directory where extensions are stored |
| `--database-dir` | `./bin/pg` | Path to the database |
| `--database-version` | `V15` | Version of the embedded PostgreSQL database to use |
| `--database-port` | `5432` | Port on which the embedded PostgreSQL database will listen |
| `--database-max-connections` | `200` | Maximum number of connections to the embedded PostgreSQL database |
| `--connection-ttl` | `15m` | Default TTL for connections in the pool, connections will be closed after this duration if not used |
| `--server-address` | `:9192` | Address on which the gRPC server will listen |
| `--server-tls-cert` | `""` | Path to the TLS certificate file for the gRPC server |
| `--server-tls-key` | `""` | Path to the TLS key file for the gRPC server |
| `-v` | Varies | Log level verbosity (0-5) |

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
cloud-query --database-dir /data/postgres --database-port 5433
```

### Starting the server with TLS enabled

```bash
cloud-query --server-tls-cert /path/to/cert.pem --server-tls-key /path/to/key.pem
```

### Starting the server with increased connection pool size

```bash
cloud-query --database-max-connections 500 --connection-ttl 30m
```

### Setting more verbose logging

```bash
cloud-query -v=3
```

## Note on Directory Paths

When specifying directory paths, such as for `--extensions-dir` and `--database-dir`, you should ensure that:

1. The directories exist or the Cloud-Query process has permissions to create them
2. The Cloud-Query process has read/write permissions for these directories
3. For production use, consider using absolute paths instead of relative paths
