# Plural Agent for Kubernetes

Plural Agent for Kubernetes is an active in-cluster component for solving any Plural<->Kubernetes integration tasks.

It's implemented as two communicating pieces - Plural Agent (`agentk`) that is running in the cluster and Plural Agent Server (`gitlab-kas`) that is running on the Plural side. Please see the [architecture](doc/architecture.md) document and other documents in the [doc](doc) directory for more information. [User-facing documentation](https://docs.gitlab.com/ee/user/clusters/agent/) is also available.

## Local development & testing

This section focuses on running and testing:

- `kas` (server) and its HTTP/WS proxy
- `agentk` (in-cluster and out-of-cluster)
- `api` (backend-for-frontend API service)

using the provided `Makefile`, local [kind](https://kind.sigs.k8s.io/) cluster, and the dev Helm chart in `hack/chart/kas`.

For a deeper architecture and development guide, see:

- [Architecture](doc/architecture.md)
- [Development guide](doc/developing.md)
- [kas request routing](doc/kas_request_routing.md)

### Prerequisites

- Linux or macOS
- Docker (or compatible container runtime) installed and running
- `kind`, `kubectl`, and `helm` on your `PATH`
- Go toolchain installed (for building binaries or running module-level `make` targets)
- Port `443` free on your host (used by ingress in the dev kind cluster)

> Note: Root `Makefile` uses its own kind kubeconfig (see `hack/include/kind.mk`). You do **not** need to point your global `KUBECONFIG` at the dev cluster.

### Repository layout (relevant pieces)

- Root
  - `Makefile` – orchestration entry point (build, test, kind + Helm, local compose)
  - `doc/` – architecture and deeper development docs
  - `hack/chart/kas` – dev Helm chart used for local testing
- `modules/`
  - `kas/` – kas & agentk source, Dockerfiles, tests and tooling
  - `api/` – backend-for-frontend API service
  - `common/`, `tools/` – shared libraries and tooling

See [doc/modules.md](doc/modules.md) for a more detailed module overview.

### Spinning up a local kind cluster with kas + proxy (Helm path)

The easiest way to get `kas` and the new proxy running is to use the root `Makefile` with kind and the Helm chart.

From the repo root:

```bash
make helm
```

This will:

1. Ensure a local kind cluster exists (see `--ensure-kind-cluster` in `hack/include/kind.mk`).
2. Ensure ingress-nginx is installed in the cluster.
3. Build required Docker images via `docker compose` (unless `NO_BUILD=true`).
4. Load the built images into the kind cluster.
5. Install/upgrade the dev `kas` Helm chart from `hack/chart/kas` into the `kas` namespace.

After this completes, ingress exposes the following endpoints on your host:

- `https://localhost/ext/kas` – proxied Kubernetes Agent endpoint (port `8180` in-cluster) via the internal reverse proxy

> Tip: You can rerun `make helm` anytime to rebuild, reload, and redeploy.

### Running kas + agentk with Docker Compose (modules/kas path)

For working specifically on `kas` and `agentk` you can use the `modules/kas` `Makefile`.

From the repo root:

```bash
cd modules/kas
make run          # kas + agentk + dependencies via docker compose
```

Notes:

- These targets expect a default kind cluster to be available (the same one you can create via `make helm` at the root).
- `make run` will prepare certificates and secrets under the directory configured by `SECRET_DIRECTORY` (see `modules/kas/build/include/config.mk`).

### Building kas and agentk binaries

To build the `kas` and `agentk` binaries without Docker:

```bash
cd modules/kas
make build        # builds both kas and agentk into the .bin directory
# or
make build-kas
make build-agentk
```

The exact destination is controlled by `KAS_DIST_DIR` in `modules/kas/build/include/config.mk`. Binaries are typically placed under a `build/dist`-like directory.

### Running agentk outside the cluster against the kas proxy

When testing the new kas proxy, `agentk` must be started from **outside** the cluster, connecting over WebSocket(S) to the proxy endpoint that kind exposes on your host.

Assuming you have:

- A kind cluster with the dev Helm chart installed (`make helm` already ran)
- An external kubeconfig pointing at that cluster (for example an "ext" kubeconfig with the right server address)
- A valid Plural deploy token for the agent (`PLRL_DEPLOY_TOKEN`)

You can start `agentk` out-of-cluster from the repo root as follows:

```bash
cd modules/kas
# build the binary if you haven't already
make build-agentk

# then run agentk from outside the cluster, pointing it at the proxy
KUBECONFIG=<PATH_TO_EXT_KIND_KUBECONFIG> \
AGENTK_TOKEN=<PLRL_DEPLOY_TOKEN> \
POD_NAMESPACE=default \
POD_NAME=agentk \
./.bin/agentk \
  --kas-insecure-skip-tls-verify \
  --kas-address=wss://kas.local/ext/kas
```

Key points:

- `KUBECONFIG` should reference a kubeconfig that can reach the kind cluster from your host.
- `AGENTK_TOKEN` is the token for the Plural agent.
- `POD_NAMESPACE` and `POD_NAME` are used for leader election; ensure `POD_NAMESPACE` exists in the cluster:

  ```bash
  kubectl --kubeconfig "$KUBECONFIG" create namespace "$POD_NAMESPACE" || true
  ```

- `--kas-insecure-skip-tls-verify` is typically needed in local dev because the ingress TLS is self-signed.
- `--kas-address` must match the proxy hostname and path configured by the Helm chart and kind ingress. In the default setup this is `wss://kas.local/ext/kas`.

For non-proxy (direct) development setups, see [doc/developing.md](doc/developing.md) for examples using `grpc://127.0.0.1:8150` and a `token.txt` file instead of `AGENTK_TOKEN`.

### Testing the kas API service (modules/api)

The `modules/api` module provides a kas-backed API. You can develop and test it against your local kas deployment.

Typical workflow:

1. Ensure `kas` and the proxy are running in your dev kind cluster (via `make helm`).
2. From the repo root, run API tests:

   ```bash
   cd modules/api
   make test
   ```

3. For manual testing or local runs, see the `modules/api/Makefile` and the package layout under `modules/api/pkg`.

> The root `make test` will run tests across all modules, including `kas` and `api`:
>
> ```bash
> make test
> ```

### Smoke checks & troubleshooting

After `make helm`:

```bash
# Check kas components
kubectl --namespace kas get pods

# Inspect logs
kubectl --namespace kas logs deploy/kas
kubectl --namespace kas logs deploy/kas-proxy
```

Common issues:

- **Port 443 already in use** – stop whatever is listening on 443 before running `make helm`.
- **Docker not running / permission errors** – ensure Docker is started and your user can run `docker` commands.
- **GOPATH issues in modules/kas** – `modules/kas/Makefile` requires `GOPATH` to be set and `GOPATH/bin` to be on your `PATH` for tool installation.
- **Old certs/secrets in `SECRET_DIRECTORY`** – use `make stop` (modules/kas) or rerun `make helm` from the root to regenerate.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Third-party trademarks

[Kubernetes](https://kubernetes.io/) is a registered trademark of [The Linux Foundation](https://www.linuxfoundation.org/).
