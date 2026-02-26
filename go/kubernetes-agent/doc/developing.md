# Development guide

[[_TOC_]]

## Repository overview

Most up-to-date video describing how this repository is
structured:

[![Plural Agent repository overview - It's time to Go! Episode 5](https://img.youtube.com/vi/Mh7PG4_cBxI/0.jpg)](https://www.youtube.com/watch?v=Mh7PG4_cBxI "Plural Agent repository overview")

### Past recordings

#### 2021-11-20

[![Plural Agent repository overview](http://img.youtube.com/vi/j8CyaCWroUY/1.jpg)](http://www.youtube.com/watch?v=j8CyaCWroUY "Plural Agent repository overview")

For a high-level architecture description, see [architecture.md](architecture.md).

## Running kas, agentk and the API locally

[![Plural Agent development environment setup](https://img.youtube.com/vi/UWptMO-Amtc/0.jpg)](https://www.youtube.com/watch?v=UWptMO-Amtc "Plural Agent development environment setup")

You can run `kas`, `agentk` and the Plural Kubernetes API (`modules/api`) locally to test the agent end-to-end.

There are two main workflows:

- **Helm + kind** (recommended): deploy `kas` (and its proxy) into a local kind cluster using the dev Helm chart.
- **Docker Compose (modules/kas)**: run `kas` and `agentk` via docker compose against an existing cluster.

### Prerequisites

- Docker (or compatible runtime) installed and running.
- `kind`, `kubectl`, `helm` installed.
- Go installed (for building binaries and running `make` targets).
- On Linux/macOS, ensure port `443` is free (used by ingress in the dev kind cluster).

### Helm + kind dev environment

From the repository root, you can prepare a full dev environment with a single command:

```bash
make helm
```

This command:

1. Creates or reuses a dedicated kind cluster.
2. Installs ingress-nginx into the cluster.
3. Builds the required Docker images.
4. Loads those images into kind.
5. Installs or upgrades the dev `kas` Helm chart from `hack/chart/kas` into the `kas` namespace.

After this step, you should see the `kas` components running:

```bash
kubectl -n kas get pods
```

The dev ingress exposes the following endpoints on your host:

- `https://localhost/ext/kas` – proxied Kubernetes Agent endpoint through the internal reverse proxy.

This environment is what the Plural UI and the `modules/api` service are expected to talk to.

### Running kas + agentk via Docker Compose (modules/kas)

For focused work on `kas` and `agentk`, you can use the `modules/kas` `Makefile` which runs both components via docker compose.

From the repository root:

```bash
cd modules/kas
make run          # kas + agentk + dependencies via docker compose
# or
make run-debug    # debug images with Delve exposed on ports 40000 (kas) and 40001 (agentk)
```

Notes:

- These targets expect a default kind cluster to be available (you can create it via the root `make helm` target).
- The `run` targets prepare certificates and secrets under the directory configured by `SECRET_DIRECTORY`.
- Use `make stop` / `make stop-debug` in `modules/kas` to stop the stack and clean up local images.

### Running agentk outside the cluster

For some scenarios (for example, testing the new kas proxy), you may want to run `agentk` **outside** the cluster, connecting to a kas proxy endpoint exposed on your host.

Assuming:

- You have created the dev kind cluster and deployed `kas` and its proxy via `make helm`.
- You have an external kubeconfig that can reach the dev kind cluster.
- You have a valid Plural deploy token for the agent.

You can run `agentk` directly as a local binary. A typical pattern looks like this:

```bash
cd modules/kas
make build-agentk

KUBECONFIG=<PATH_TO_EXT_KIND_KUBECONFIG> \
AGENTK_TOKEN=<PLRL_DEPLOY_TOKEN> \
POD_NAMESPACE=default \
POD_NAME=agentk \
./.bin/agentk \
  --kas-insecure-skip-tls-verify \
  --kas-address=wss://kas.local/ext/kas
```

- `POD_NAMESPACE` and `POD_NAME` are used for leader election; ensure the namespace exists:

  ```bash
  kubectl --kubeconfig "$KUBECONFIG" create namespace "$POD_NAMESPACE" || true
  ```

- `--kas-insecure-skip-tls-verify` is usually required for local development because the ingress uses self-signed certificates.
- `--kas-address` must match the hostname and path configured by the Helm chart and kind ingress.

For direct (non-proxy) development setups you can run `agentk` against a raw `kas` endpoint instead, for example:

```bash
export POD_NAMESPACE=ns
export POD_NAME=agent1
kubectl create ns "$POD_NAMESPACE" || true

./.bin/agentk \
  --kas-address=grpc://127.0.0.1:8150 \
  --token-file="$(pwd)/token.txt" \
  --context=<your-context>
```

See the repository root [README](../README.md) for more details on the recommended commands.

### Running the Plural Kubernetes API (`modules/api`)

The `modules/api` module implements the Plural-facing backend-for-frontend API on top of `kas`.

Common flows:

- **Run tests for the API module**:

  ```bash
  cd modules/api
  make test
  ```

- **Run tests for all modules (including `kas` and `api`)** from the repository root:

  ```bash
  make test
  ```

- **Manual/local runs**: see `modules/api/Makefile` and the `modules/api/pkg` packages for concrete entry points and configuration flags depending on your deployment.

## Debugging locally

For local debugging you can run `kas` and `agentk` from source and attach a debugger.

### dlv

Debug `agentk` with the following command:

```sh
export POD_NAMESPACE=default
export POD_NAME=agentk

# assume kas is already running and reachable at ${kas_address}

dlv cmd/agentk/main.go -- \
    --kas-address "${kas_address}" \
    --token-file "${token_file}"
```

Debug `kas` with the following command:

```sh
export OWN_PRIVATE_API_URL="grpc://127.0.0.1:8155"  # adjust to your local config

dlv cmd/kas/main.go -- \
  --configuration-file "${kas_config_file}"
```

### VS Code

To debug in VS Code, use the following [Launch Configuration](https://code.visualstudio.com/docs/editor/debugging#_launch-configurations). Adjust paths and arguments to match your local environment.

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch agentk",
      "type": "go",
      "request": "launch",
      "mode": "auto",
      "program": "${workspaceFolder}/cmd/agentk/",
      "args": [
        "--kas-address",
        "grpc://127.0.0.1:8150",
        "--token-file",
        "${workspaceFolder}/token.txt"
      ],
      "env": {
        "POD_NAMESPACE": "default",
        "POD_NAME": "agentk"
      }
    },
    {
      "name": "Launch kas",
      "type": "go",
      "request": "launch",
      "mode": "auto",
      "program": "${workspaceFolder}/cmd/kas/",
      "args": [
        "--configuration-file",
        "${workspaceFolder}/kas-config.yml"
      ],
      "env": {
        "OWN_PRIVATE_API_URL": "grpc://127.0.0.1:8155"
      }
    }
  ]
}
```

### JetBrains GoLand

Add run/debug configurations similar to the VS Code ones:

- For `kas`: run `cmd/kas`, passing `--configuration-file` and any required environment variables (such as `OWN_PRIVATE_API_URL`).
- For `agentk`: run `cmd/agentk`, passing `--kas-address`, `--token-file` and environment variables `POD_NAMESPACE` and `POD_NAME`.

It's optional, but consider specifying `--context=<desired context>` command line argument to not depend on the currently selected context.

## Optimizing build performance

Go builds and tests can generate a lot of files. If you are iterating quickly, consider:

- Using a fast local disk (SSD) for your Go module cache and build cache.
- Adjusting `GOMODCACHE` and `GOCACHE` to point to a faster filesystem.

For large multi-module builds you can also experiment with `GOMAXPROCS` and Go build flags to balance speed and resource usage.

```plaintext
# Example: put Go cache on a fast disk
export GOCACHE=/mnt/fastdisk/gocache
export GOMODCACHE=/mnt/fastdisk/gomodcache
```

## Ruby gRPC interface

In the original GitLab-based version of this project, a Ruby gRPC gem was generated for integration with a Ruby on Rails backend. In Plural environments, the primary integration surface is the Go-based `api` module and other backend services rather than a Rails application.

If you need a language-specific client for `kas` (Ruby or otherwise), the recommended approach is to:

1. Use the `.proto` definitions under `pkg/`.
2. Generate client code using your language's protobuf/gRPC tooling.
3. Integrate that client into your service following your stack's conventions.
