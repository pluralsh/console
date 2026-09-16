# Repository prebake images

Build a container image that holds full git clones plus a `manifest.json`.
Set it on `AgentRuntime.spec.repositoryImage` so agent-run pods copy it into
`/plural/shared/repos` before bootstrap. Bootstrap then copies a matching repo
into `/plural/shared/repository` instead of cloning over the network, and
agents can read the other prebaked repos as extra context.

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

The operator starts a `repository-prebake` init container from that image. It
copies `/data/.` into the existing `shared-context` emptyDir at
`/plural/shared/repos`, then `agent-bootstrap` runs. No extra volume and no
Kubernetes image-volume feature gate. Use `spec.template.spec.imagePullSecrets`
if the image is private.

The image must include `/bin/sh` and `cp`, with repos under `/data`.

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

Files are owned by uid `65532` (nonroot) so agent-run pods can read them.

When `/plural/shared/repos/manifest.json` is present, agent-bootstrap matches
the run repository URL (https and ssh forms of the same repo are equivalent)
and copies that tree into `/plural/shared/repository`. Fetch of the requested
branch is best-effort; an airgapped or stale remote keeps the prebaked copy.
Other prebaked repos stay at `/plural/shared/repos/<path>` and are listed in
the agent system prompt.

## Base image

`ghcr.io/pluralsh/repository-prebake` is Debian plus `git` and a `prebake`
binary. Extend it and run clone + manifest **inside** the image you push
(`docker build`, `docker/build-push-action`, and so on). The CLI is not a
host-side wrapper around `docker build`.

```dockerfile
FROM ghcr.io/pluralsh/repository-prebake:latest
COPY repos.yaml /config/repos.yaml
RUN prebake --config /config/repos.yaml --dest /data --chown 65532:65532
```

```yaml
# repos.yaml
repositories:
  - url: https://github.com/org/repo.git
    path: repo                 # optional, defaults to the repo name
    branch: main               # optional, defaults to the remote default branch
  - https://github.com/org/other.git
```

If `/data/<path>` already contains a `.git` directory, `prebake` keeps that
checkout instead of cloning (use `COPY` of a local tree, then `RUN prebake`).

```text
prebake --config repos.yaml --dest /data [--recurse-submodules] [--lfs] [--chown uid:gid]
```

Private remotes: pass credentials the same way as any Docker build (`RUN
--mount=type=secret`, `GIT_ASKPASS`, `.netrc`). Do not leave tokens in
`repos.yaml`; `prebake` strips URL userinfo from `origin` and `manifest.json`.

CI publishes `ghcr.io/pluralsh/repository-prebake:sha-<short>` (`:latest` on
`master`).

From this repository:

```bash
docker build -f repository-prebake/Dockerfile --target base \
  -t ghcr.io/pluralsh/repository-prebake:local .
```

## Inspect

```bash
cid="$(docker create ghcr.io/pluralsh/console-repos:latest unused)"
docker cp "$cid:/data/manifest.json" -
docker rm "$cid"
```

## Precompile

`prebake` only clones and writes `manifest.json`. Compile artifacts belong in
later `RUN` steps in **your** Dockerfile so they land under `/data/<path>`
(`_build`, `deps`, `node_modules`, in-tree Go caches).

Go caches must live **inside** the copied repository. If `GOPATH` / `GOBIN` /
`GOCACHE` / `GOMODCACHE` point outside that tree, they will not survive
`CopyDir` into `/plural/shared/repository`:

```bash
export GOPATH=/data/console/.gopath
export GOBIN=/data/console/.gopath/bin
export GOCACHE=/data/console/.cache/go-build
export GOMODCACHE=/data/console/.cache/pkg/mod
```

## Console image

This directory's Dockerfile `--target console` bakes `pluralsh/console`: copy
the git checkout to `/data/console`, `prebake`, then [`precompile.sh`](precompile.sh)
(Elixir `MIX_ENV=test mix compile`, JS `yarn install --immutable`, Go workspace
modules under `go/` with `go test -run='^$'`).

CI builds it on every PR and every push to `master` as
`ghcr.io/pluralsh/console-repos:sha-<short>` (`:pr-<n>` on pull requests, `:latest`
on master). To test a branch, set:

```yaml
spec:
  repositoryImage: ghcr.io/pluralsh/console-repos:sha-<short>
```

Locally, from the console repository root (use the console ignore file so
`.git` is copied and build artifacts are not):

```bash
cp repository-prebake/console.dockerignore .dockerignore
docker build -f repository-prebake/Dockerfile --target console \
  -t ghcr.io/pluralsh/console-repos:local .
```
