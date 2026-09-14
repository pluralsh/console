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
  repositoryImage: ghcr.io/pluralsh/repos:latest
```

The operator starts a `repository-prebake` init container from that image. It
copies `/data/.` into the existing `shared-context` emptyDir at
`/plural/shared/repos`, then `agent-bootstrap` runs. No extra volume and no
Kubernetes image-volume feature gate. Use `spec.template.spec.imagePullSecrets`
if the image is private.

Rebuild prebake images after this layout change. Scratch images with files at
`/` cannot copy themselves; the image must include `/bin/sh` and `cp`, with
repos under `/data`.

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

## Build

The script clones on the host using your existing git credentials (`ssh-agent`,
`GIT_ASKPASS`, `~/.git-credentials`, and so on), then `docker build`s the image.

```bash
./prebake.sh \
  --config repos.example.yaml \
  --image ghcr.io/pluralsh/repos:latest \
  --push
```

Required tools: `git`, `python3`, and `docker` (override the client with
`DOCKER_BIN=podman` if needed).

### Config

```yaml
repositories:
  - url: https://github.com/pluralsh/console.git
    path: console                 # optional, defaults to the repo name
    branch: master                # optional, defaults to the remote default branch
  - url: https://github.com/pluralsh/plural.git
```

Shorthand URL-only items are also accepted:

```yaml
repositories:
  - https://github.com/pluralsh/console.git
```

### Options

| Flag | Meaning |
|------|---------|
| `--push` | Push the image after a successful build |
| `--staging DIR` | Write clones into `DIR` instead of a temp directory (kept on exit) |
| `--keep-staging` | Leave the temp staging directory in place |
| `--recurse-submodules` | Clone submodules |
| `--lfs` | Fetch Git LFS objects (skipped by default) |
| `--dry-run` | Parse the config and print planned clones |

Private HTTPS remotes that embed a token in the URL are stored in the manifest
and `origin` remote **without** userinfo.

## Inspect

```bash
cid="$(docker create ghcr.io/pluralsh/repos:latest unused)"
docker cp "$cid:/data/manifest.json" -
docker rm "$cid"
```
