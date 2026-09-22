# Repository prebake images

Build a container image that holds full git clones plus a `manifest.json`.
Set it on `AgentRuntime.spec.repositoryImage` so agent-run pods copy it into
`/plural/shared/repos` before bootstrap. Bootstrap then moves a matching repo
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
  repositoryImage: docker.io/pluralsh/console-repos:latest
```

The operator starts a `repository-prebake` init container from that image. It
copies `/data/.` into the existing `shared-context` emptyDir at
`/plural/shared/repos`, then `agent-bootstrap` runs. No extra volume and no
Kubernetes image-volume feature gate. Use `spec.template.spec.imagePullSecrets`
if the image is private.

The image must include `/bin/sh` and `cp`, with repos under `/data`.

## Layout

```
repository-prebake/
  base/       # docker.io/pluralsh/repository-prebake (CLI + git)
  console/    # docker.io/pluralsh/console-repos (extends base)
```

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

User-facing walkthrough: [Prebaked repositories](https://docs.plural.sh/plural-features/plural-ai/ai-agent/repository-prebake).

When `/plural/shared/repos/manifest.json` is present, agent-bootstrap matches
the run repository URL (https and ssh forms of the same repo are equivalent)
and moves that tree into `/plural/shared/repository` (rename on the same
volume; copy+delete if rename is not possible). Fetch of the requested
branch is best-effort; an airgapped or stale remote keeps the prebaked copy.
Other prebaked repos stay at `/plural/shared/repos/<path>` and are listed in
the agent system prompt.

## Base image

`docker.io/pluralsh/repository-prebake` is Debian plus `git`, `mise`, a compile
toolchain, and a `prebake` binary. Extend it and run clone + manifest **inside**
the image you push (`docker build`, `docker/build-push-action`, and so on). The
CLI is not a host-side wrapper around `docker build`.

```dockerfile
FROM docker.io/pluralsh/repository-prebake:latest
COPY repos.yaml /config/repos.yaml
RUN prebake --config /config/repos.yaml --chown 65532:65532
```

Private HTTPS remotes: keep `url:` token-free and pass the password at build time.
`prebake` installs a `GIT_ASKPASS` helper when `GIT_ACCESS_TOKEN` or
`GIT_PASSWORD` is set (`GIT_USERNAME` defaults to `x-access-token`):

```dockerfile
FROM docker.io/pluralsh/repository-prebake:latest
COPY repos.yaml /config/repos.yaml
RUN --mount=type=secret,id=git_token \
    GIT_ACCESS_TOKEN="$(cat /run/secrets/git_token)" \
    prebake --config /config/repos.yaml --chown 65532:65532
```

```bash
docker build --secret id=git_token,env=GIT_ACCESS_TOKEN -t my-repos:local .
```

Do not put tokens in `repos.yaml` or a Docker `ARG`. `prebake` still strips
URL userinfo from `origin` and `manifest.json`.

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
prebake --config repos.yaml [--dest /data] [--recurse-submodules] [--lfs] [--chown uid:gid]
```

`--dest` defaults to `/data`, which the agent-run init container copies into
the pod. Extra compile steps belong after `prebake` and must write under
`/data/<path>`.

CI publishes `repository-prebake:<YYYY-MM-DD>` and `:latest` to Docker Hub,
GHCR, and GCR every day and on manual runs.

From this repository:

```bash
docker build -f repository-prebake/base/Dockerfile \
  -t docker.io/pluralsh/repository-prebake:local \
  go/repository-prebake
```

## Inspect

```bash
cid="$(docker create docker.io/pluralsh/console-repos:latest unused)"
docker cp "$cid:/data/manifest.json" -
docker rm "$cid"
```

## Precompile

`prebake` only clones and writes `manifest.json`. Compile artifacts belong in
later `RUN` steps in **your** Dockerfile so they land under `/data/<path>`
(`_build`, `deps`, `node_modules`, in-tree Go caches).

Go caches and Mix archives must live **inside** the copied repository. If
`GOPATH` / `GOBIN` / `GOCACHE` / `GOMODCACHE` / `MIX_HOME` / `MIX_ARCHIVES`
point outside that tree, they will not survive `CopyDir` into
`/plural/shared/repository`. mise's elixir plugin sets `MIX_ARCHIVES` to the
runtime Elixir prefix unless you override it, so Hex must be installed under
the repo during precompile:

```bash
export MIX_HOME=/data/console/.mix
export MIX_ARCHIVES=/data/console/.mix/archives
export HEX_HOME=/data/console/.hex
export GOPATH=/data/console/.gopath
export GOBIN=/data/console/.gopath/bin
export GOCACHE=/data/console/.cache/go-build
export GOMODCACHE=/data/console/.cache/pkg/mod
export GOWORK=/data/console/go/go.work
```

## Console image

[`console/`](console/) extends the published base image: copy this checkout to
`/data/console`, `prebake` (Console plus `plural-cli`, `plural`, and authed
`plrl-up-demos` extra context),
then runs the ordered scripts under [`console/precompile/`](console/precompile/)
to prepare Console's Elixir, JavaScript, and Go trees, plural-cli's Go tree,
and Plural's Elixir and JavaScript trees. Pass `GIT_ACCESS_TOKEN` as a BuildKit
secret so `prebake` can clone the private repo.

CI builds it daily and on manual runs as
`docker.io/pluralsh/console-repos:<YYYY-MM-DD>` and `:latest`. To pin a daily
build, set:

```yaml
spec:
  repositoryImage: docker.io/pluralsh/console-repos:<YYYY-MM-DD>
```

Locally, from the console repository root. Build the base image first:

```bash
docker build -f repository-prebake/base/Dockerfile \
  -t docker.io/pluralsh/repository-prebake:local \
  go/repository-prebake
cp repository-prebake/console/.dockerignore .dockerignore
docker build -f repository-prebake/console/Dockerfile \
  --build-arg PREBAKE_IMAGE=docker.io/pluralsh/repository-prebake:local \
  --secret id=git_token,env=GIT_ACCESS_TOKEN \
  -t docker.io/pluralsh/console-repos:local \
  .
```
