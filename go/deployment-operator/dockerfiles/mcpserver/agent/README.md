# Agent Pod Simulation (Compose)

This compose stack simulates the Kubernetes agent pod topology:

- `shared-permissions` runs first as root and prepares `/plural/shared` ownership for UID/GID `65532`.
- `bootstrap` runs once (`/agent-bootstrap`) and clones/prepares the repository in `/plural/shared/repository`.
- `mcpserver` runs as a sidecar (`/agent-mcpserver`) and exposes MCP HTTP (`:8080`) + internal gRPC (`:8081`).
- `harness` runs `agent-harness` and shares the `mcpserver` network namespace so `127.0.0.1:8081` works like in a pod.

## Usage

```bash
docker compose up --build
```

Select provider-specific harness image:

```bash
PLRL_AGENT_PROVIDER=opencode docker compose up --build
PLRL_AGENT_PROVIDER=codex docker compose up --build
PLRL_AGENT_PROVIDER=claude docker compose up --build
PLRL_AGENT_PROVIDER=gemini docker compose up --build
```

Stop:

```bash
docker compose down -v
```

## Notes

- `PLRL_CONSOLE_URL`, `PLRL_DEPLOY_TOKEN`, and `PLRL_AGENT_RUN_ID` are required for bootstrap + harness.
- `PLRL_CONSOLE_TOKEN` and `GIT_ACCESS_TOKEN` are required for mcpserver sidecar.
- Shared workspace volume is mounted at `/plural/shared` in all services.
- `PLRL_AGENT_PROVIDER` selects the harness Dockerfile: one of `opencode`, `codex`, `claude`, `gemini` (default: `opencode`).
