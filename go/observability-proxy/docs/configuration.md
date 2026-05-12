# Configuration

Flags and environment variables:

- `--listen-addr` / `OBS_PROXY_LISTEN_ADDR`
- `--console-grpc-endpoint` / `OBS_PROXY_CONSOLE_GRPC_ENDPOINT`
- `--config-ttl` / `OBS_PROXY_CONFIG_TTL`
- `--grpc-timeout` / `OBS_PROXY_GRPC_TIMEOUT`
- `--upstream-timeout` / `OBS_PROXY_UPSTREAM_TIMEOUT`
- `--meter-interval` / `OBS_PROXY_METER_INTERVAL`

Default values:

- `listen-addr=:8080`
- `console-grpc-endpoint=localhost:50051`
- `config-ttl=60s`
- `grpc-timeout=10s`
- `upstream-timeout=30s`
- `meter-interval=30s`

Common local run:

```bash
make run
```
