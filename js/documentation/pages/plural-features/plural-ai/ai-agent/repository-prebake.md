---
title: Prebaked repositories
description: Speed up agent bootstrap with precloned git repositories, and extend the repository-prebake base image.
---

Agent bootstrap normally clones the run repository over the network. A **prebake image** is an OCI image of full git clones plus a `manifest.json`. Point `AgentRuntime.spec.repositoryImage` at that image so the pod copies it into `/plural/shared/repos` before bootstrap. Bootstrap then moves a matching checkout into `/plural/shared/repository` instead of cloning over the network. Other prebaked repos stay on disk as extra context.

For field-level details, see the [AgentRuntimeSpec API reference](/api-reference/kubernetes/agent-api-reference#agentruntimespec).

## Use a published image

Plural publishes a Console checkout as `ghcr.io/pluralsh/console-repos`:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: AgentRuntime
metadata:
  name: claude
spec:
  type: CLAUDE
  targetNamespace: agents
  repositoryImage: ghcr.io/pluralsh/console-repos:latest
```

Tags:

- `sha-<short>` on every build
- `pr-<n>` on pull requests
- `latest` on `master`

To test a branch, use the matching `sha-<short>` tag. If the image is private, set `spec.template.spec.imagePullSecrets`.

## How it works

1. The operator starts a `repository-prebake` init container from `repositoryImage`.
2. That container copies `/data/.` into the existing `shared-context` emptyDir at `/plural/shared/repos`.
3. `agent-bootstrap` matches the run repository URL (https and ssh forms of the same repo are equivalent) and **moves** that tree into `/plural/shared/repository` so the working copy does not duplicate disk. If rename is not possible, it copies then deletes the source. Other prebaked repos stay under `/plural/shared/repos/<path>`.
4. Fetch of the requested branch is best-effort. An airgapped or stale remote keeps the prebaked copy.

No extra volume and no Kubernetes image-volume feature gate. The image must include `/bin/sh` and `cp`, with repos under `/data`, owned by uid `65532` so the non-root agent can read them.

## Image layout

```
/data/manifest.json
/data/<path>/          # full git clone, including .git
```

After the init container copies that tree, the harness sees:

```
/plural/shared/repos/manifest.json
/plural/shared/repos/<path>/
/plural/shared/repository/     # working copy of the run's repo
```

`manifest.json`:

```json
{
  "version": 1,
  "repositories": [
    {
      "url": "https://github.com/pluralsh/console.git",
      "path": "console",
      "defaultBranch": "master"
    }
  ]
}
```

`path` is relative to `/data` and must not contain `.` or `..` components.

Inspect a published image:

```bash
cid="$(docker create ghcr.io/pluralsh/console-repos:latest unused)"
docker cp "$cid:/data/manifest.json" -
docker rm "$cid"
```

## Extend the base image

`ghcr.io/pluralsh/repository-prebake` is Debian plus `git`, `mise`, a compile toolchain, and a `prebake` binary. **Clone and write the manifest inside the image you push.** Users build with a normal `Dockerfile` and `docker/build-push-action`. The CLI is not a host-side wrapper around `docker build`.

```dockerfile
FROM ghcr.io/pluralsh/repository-prebake:latest

COPY repos.yaml /config/repos.yaml
RUN prebake --config /config/repos.yaml --chown 65532:65532
```

Private HTTPS remotes: leave `url:` without userinfo and pass the token at build time. When `GIT_ACCESS_TOKEN` or `GIT_PASSWORD` is set, `prebake` wires `GIT_ASKPASS` (`GIT_USERNAME` defaults to `x-access-token`):

```dockerfile
FROM ghcr.io/pluralsh/repository-prebake:latest
COPY repos.yaml /config/repos.yaml
RUN --mount=type=secret,id=git_token \
    GIT_ACCESS_TOKEN="$(cat /run/secrets/git_token)" \
    prebake --config /config/repos.yaml --chown 65532:65532
```

```bash
docker build --secret id=git_token,env=GIT_ACCESS_TOKEN -t ghcr.io/org/my-repos:local .
```

Do not put tokens in `repos.yaml` or a Docker `ARG`. `prebake` strips URL userinfo from `origin` and `manifest.json`.

```yaml
# repos.yaml
repositories:
  - url: https://github.com/org/app.git
    path: app                  # optional, defaults to the repo name
    branch: main               # optional, defaults to the remote default branch
  - https://github.com/org/lib.git
```

String entries and mappings can be mixed. `repos:` is accepted as an alias for `repositories:`.

CI publishes `ghcr.io/pluralsh/repository-prebake:sha-<short>` (`:latest` on `master`). Pin a SHA tag in production; `:latest` moves.

### `prebake` CLI

```text
prebake --config repos.yaml [--dest /data] [--recurse-submodules] [--lfs] [--chown uid:gid]
```

| Flag | Default | Purpose |
| --- | --- | --- |
| `--config` | required | YAML listing repositories |
| `--dest` | `/data` | Clones and `manifest.json`. The init container copies this tree into the pod. |
| `--recurse-submodules` | off | Pass `--recurse-submodules` to `git clone` |
| `--lfs` | off | Fetch Git LFS objects |
| `--chown` | unset | `uid:gid` (or `uid`) applied recursively to `--dest` |

HTTPS auth (env, not flags): `GIT_ACCESS_TOKEN` or `GIT_PASSWORD`, optional `GIT_USERNAME` (default `x-access-token`).

If `/data/<path>` already contains a `.git` directory, `prebake` keeps that checkout instead of cloning. Use that to bake the CI checkout SHA:

```dockerfile
FROM ghcr.io/pluralsh/repository-prebake:latest
COPY repos.yaml /config/repos.yaml
COPY . /data/app
RUN git config --global --add safe.directory /data/app \
 && prebake --config /config/repos.yaml \
 && chown -R 65532:65532 /data
```

`prebake` strips URL userinfo from `origin` and `manifest.json`. Do not leave tokens in `repos.yaml`.

### Build with GitHub Actions

```yaml
- uses: docker/setup-buildx-action@v3
- uses: docker/build-push-action@v6
  with:
    context: .
    file: Dockerfile
    push: true
    tags: ghcr.io/org/my-repos:sha-${{ github.sha }}
    secrets: |
      git_token=${{ secrets.GIT_ACCESS_TOKEN }}
```

## Precompile after prebake

`prebake` only clones and writes `manifest.json`. Compile artifacts belong in later `RUN` steps in **your** Dockerfile, and must land under `/data/<path>` (`_build`, `deps`, `node_modules`, in-tree Go caches). Anything outside `/data` is not copied into the pod.

Go caches must live **inside** the copied repository. If `GOPATH` / `GOBIN` / `GOCACHE` / `GOMODCACHE` point outside that tree, they will not survive the copy into `/plural/shared/repository`:

```dockerfile
FROM ghcr.io/pluralsh/repository-prebake:latest

COPY repos.yaml /config/repos.yaml
RUN prebake --config /config/repos.yaml

WORKDIR /data/app
ENV GOPATH=/data/app/.gopath \
    GOBIN=/data/app/.gopath/bin \
    GOCACHE=/data/app/.cache/go-build \
    GOMODCACHE=/data/app/.cache/pkg/mod
RUN mix deps.get && MIX_ENV=test mix compile \
 && chown -R 65532:65532 /data
```

## Console image

The in-tree [`repository-prebake/console`](https://github.com/pluralsh/console/tree/master/repository-prebake/console) Dockerfile extends the published base: `COPY` this checkout to `/data/console`, `RUN prebake` (Console plus authed `plrl-up-demos` extra context), then `precompile.sh`. CI builds it as `ghcr.io/pluralsh/console-repos`. Pass `GIT_ACCESS_TOKEN` as a BuildKit secret so `prebake` can clone the private repo.

Locally, from the Console repository root, build the base image first:

```bash
docker build -f repository-prebake/base/Dockerfile \
  -t ghcr.io/pluralsh/repository-prebake:local \
  go/repository-prebake
cp repository-prebake/console/.dockerignore .dockerignore
docker build -f repository-prebake/console/Dockerfile \
  --build-arg PREBAKE_IMAGE=ghcr.io/pluralsh/repository-prebake:local \
  --secret id=git_token,env=GIT_ACCESS_TOKEN \
  -t ghcr.io/pluralsh/console-repos:local \
  .
```

## Mise toolchains at agent boot

To install language tools **in the agent container** without wrapping compiles in DinD, supply a [mise](https://mise.jdx.dev/bootstrap.html) config and keep the default container writable. `mise` is already in the agent-harness image (and in `repository-prebake` for image builds). If it is missing at run time, the harness logs an error and continues without toolchain bootstrap.

```yaml
spec:
  repositoryImage: ghcr.io/pluralsh/console-repos:latest
  readOnlyRootFilesystem: false
  mise:
    config: |
      [tools]
      elixir = "1.19.4"
      go = "1.27.1"
      node = "24.11.1"
      [env]
      MIX_HOME = "/plural/shared/repository/.mix"
      MIX_ARCHIVES = "/plural/shared/repository/.mix/archives"
      HEX_HOME = "/plural/shared/repository/.hex"
      GOPATH = "/plural/shared/repository/.gopath"
      GOBIN = "/plural/shared/repository/.gopath/bin"
      GOCACHE = "/plural/shared/repository/.cache/go-build"
      GOMODCACHE = "/plural/shared/repository/.cache/pkg/mod"
      GOWORK = "/plural/shared/repository/go/go.work"
```

The harness runs `mise trust` and `mise bootstrap --yes` before the coding agent starts. Point Mix home, `MIX_ARCHIVES`, `GOWORK`, and Go caches at `/plural/shared/repository` so those directories survive from the prebake copy.

If you extend a finished image that already ran `mise bootstrap` at build time, set `readOnlyRootFilesystem: true`. The same `mise.config` is still mounted so `mise exec` sees `[tools]` and `[env]`, but bootstrap is skipped.

DinD requires a writable root filesystem. If both `dind: true` and `readOnlyRootFilesystem: true` are set, the operator clears read-only on the default container so Podman can start.

A template `securityContext` that omits `readOnlyRootFilesystem` inherits the CRD value. An explicit template value still wins (except when DinD is enabled).
