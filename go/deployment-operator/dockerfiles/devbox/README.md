# Devbox images

Dockerfiles for the devbox sandbox and gateway images (DBX-49). All builds use
`./go` as the context, like the other deployment operator images.

| Image | Dockerfile | Contents |
|---|---|---|
| `ghcr.io/pluralsh/devbox-minimal` | `minimal.Dockerfile` | Environment image: every harness and ACP adapter, Node, Chromium, Xvfb, x11vnc, Playwright MCP, shell tools, `mise` (and a `devbox-daemon`, see below) |
| `ghcr.io/pluralsh/devbox-fat` | `fat.Dockerfile` | Environment image: `devbox-minimal` plus language toolchains, DevOps tools, cloud CLIs and rootless Podman (`docker` and `docker compose` map onto it) |
| `ghcr.io/pluralsh/devbox-runtime-core` | `runtime-core.Dockerfile` | Runtime image: `devbox-daemon` and the installer that delivers it, nothing else |
| `ghcr.io/pluralsh/devbox-gateway` | `gateway.Dockerfile` | `devbox-gateway` on distroless |

## Environment and runtime

A devbox instance runs two images side by side:

- The **environment image** (`spec.image` of the `DevboxRunner`, `devbox-fat`
  by default) is what the user and the agents work in: tools, agents, browser.
  Customers build their own `FROM devbox-minimal` or `FROM devbox-fat`.
- The **runtime image** (`devbox-runtime-core`) holds `devbox-daemon`. It isn't
  configurable per runner: the deployment operator uses the one of its own
  version, so every operator release delivers its daemon, and its fixes, to
  every runner, whatever environment image the runner uses.

They meet in the home volume. The instance's actor has two containers, in this
order:

1. `devbox`, the environment image, started with
   `/bin/sh -c '<wait for the runtime, then exec it>'`.
2. `plural-runtime`, the runtime image. Its entrypoint
   (`devbox-runtime-installer`) copies the daemon to
   `~/.plural-runtime/<runtime digest>/bin/devbox-daemon`, writes the digest to
   `~/.plural-runtime/ready`, and stays alive.

Once `ready` names the runtime digest of the instance's template, the `devbox`
container execs the daemon from the home volume, which is PID 1 from then on,
as the image's user. An install that matches the image is never rewritten (the
daemon may be running from it); anything else under `~/.plural-runtime` is
replaced. The directory is root-owned, but it is on the user's volume and is
not a security boundary: it is checked and repaired at every cold boot.

The `devbox-daemon` baked into `devbox-minimal` and `devbox-fat`, and their
`ENTRYPOINT`, are only used when the image is run on its own (`docker run`,
`test.sh`). The operator ignores both.

### Why it is built this way

Substrate only lets an existing actor move to a template with the same
volumes and, for its existing containers, the same mounts. The layout above is
what was found to work on Substrate v1.0.0 with gVisor (PROD-5487), and each
part is load-bearing:

- The `devbox` container must be first. gVisor files a volume's checkpoint
  under the first container that mounts it, and an instance moved to a template
  with another container first loses its home.
- The sidecar must keep running. An actor with an exited container can't be
  restored from a memory snapshot.
- The sidecar mounts the home at `/mnt/home`, not `/home/dev`.
- The payload (`/payload` in the runtime image) is copied into every instance's
  home volume and so into every snapshot. Keep it to the daemon; `test.sh
  runtime` enforces a size budget.

The microVM sandbox class has not been verified with this layout yet.

### Reproducible runtime builds

The operator pins the runtime by digest, and a new digest rolls a new template
revision on every runner. So the digest must only change when the daemon does:

- `runtime-src-hash.sh` hashes everything that decides the image's contents:
  the daemon's and installer's own sources, the versions of the modules they
  link (not `go.mod`/`go.sum`, which change for dependencies they don't use),
  the Dockerfile and the bake file.
  CD builds once per hash (`devbox-runtime-core:src-<hash>`) and later releases
  with the same hash only add their tags to that digest. A tag is only a name,
  so a release reuses a digest only if a release run of the CD workflow signed
  it (`cosign verify`), and builds it otherwise. Pull requests use their own
  `pr-src-<hash>` tags. The runtime build uses no registry cache, which pull
  requests can write.
- The build itself is reproducible (pinned toolchain, `-trimpath -buildid=`,
  `SOURCE_DATE_EPOCH=0`, `rewrite-timestamp`, no attestations or build-time
  labels), so the same sources give the same digest anyway.
- The daemon's version is the release that first built its sources. It can
  trail the operator's version by any distance; that means nothing changed.

If you add an input to the image, add it to `runtime-src-hash.sh` too, or a
release will ship the previous daemon.

Published by `.github/workflows/deployment-operator-cd-devbox.yaml` on
`go/deployment-operator/v*` tags, with `X.Y.Z` and `X.Y` tags, cosign-signed by
digest. The same workflow builds pull requests (`pr-<number>` and `sha-<sha>`
tags), runs `test.sh` against each pushed digest (`MINIMAL_IMAGE`, `FAT_IMAGE`,
`GATEWAY_IMAGE`, `RUNTIME_IMAGE`) and caches layers in `ghcr.io/pluralsh/console-cache`.
`.github/workflows/deployment-operator-ci-devbox.yaml` runs the static checks.

## Layout

- `rootfs/minimal/`: files copied into `devbox-minimal`: the skeleton dotfiles
  (`/etc/devbox/skel`), the shared shell setup that loads cloud identities
  (`/usr/local/lib/devbox/devbox.sh`) and the `dev` sudoers entry.
- `rootfs/fat/`: the `aws`, `gcloud` and `az` wrappers that load the daemon's
  federated identity environment before running the real CLI.
- `stub/`: a placeholder for `devbox-daemon` and `devbox-gateway`, used with
  `DAEMON_SOURCE=stub` / `GATEWAY_SOURCE=stub` to build and test the images
  before the real binaries compile. Never publish a stub build.
- `tests/`: container-structure-test configs. `common.yaml` is the image
  contract and the minimal image's contents, so it also applies to `devbox-fat`
  and to custom images.
- `runtime-src-hash.sh`: the source hash of `devbox-runtime-core` (see above).
- `examples/`: a sample custom image `FROM devbox-minimal`.

## Testing

```bash
./test.sh                    # versions, lint, minimal, gateway, runtime, fat-check
./test.sh runtime            # the runtime image: install into a home volume, run the daemon from it
./test.sh fat example        # full fat build and the example image (several GB)
DAEMON_SOURCE=stub ./test.sh minimal
```

`versions` fails if the harness pins drift from `dockerfiles/agent-harness`.
`lint` runs hadolint, `fat-check` runs `docker buildx build --check`, and the
build steps run container-structure-test plus a runtime check that the daemon is
PID 1, answers `/readyz` and exits promptly on `SIGTERM`. Test images are removed
afterwards unless `KEEP_IMAGES=1`.

## Contract with devbox-daemon

What an environment image must provide for the daemon the runtime delivers.
The operator checks the label, the user and the trust directory when it
resolves the image; the rest fails the golden boot or its agent probe.

| What | Value |
|---|---|
| Shell | A POSIX shell at `/bin/sh` (`spec.runtime.shell` if it is elsewhere), with `sleep` on `PATH`. It starts the daemon; nothing else is needed from it |
| User | `dev` (1000:1000), declared numerically (`USER 1000:1000`), cwd `/home/dev` |
| Listen | `:80`; the daemon serves `GET /readyz` there |
| Labels | `sh.plural.devbox/contract=v1`, `sh.plural.devbox/flavor=minimal\|fat` |
| Entrypoint | Not used by the operator. The base images keep `/usr/local/bin/devbox-daemon` so they run on their own |
| Skeleton | `/etc/devbox/skel/` (`$DEVBOX_SKEL_DIR`), copied into `/home/dev` on first boot without overwriting |
| Trust store | `/var/lib/devbox/trust/` (`$DEVBOX_TRUST_DIR`, owned by `dev`). Write `ca-bundle.pem` = `/etc/ssl/certs/ca-certificates.crt` + egress CA, replacing the build-time symlink. In `devbox-fat`, also import the egress CA into `java-cacerts` (PKCS12, password `changeit`) |
| Identities | `/run/plural/identity/<name>/token` (`$DEVBOX_IDENTITY_DIR`) plus `/run/plural/identity/env`, `KEY=value` lines loaded by shells and the cloud CLI wrappers |
| Subscription credentials | `/run/plural/agent-auth/` (the daemon's `--agent-auth-dir` default, mode 0700), e.g. `codex/auth.json` |
| Browser | `$DEVBOX_CHROMIUM` (`/usr/bin/chromium`), `Xvfb`, `x11vnc`, `DISPLAY=:99`, `playwright-mcp` |
| Agents | `/etc/devbox/image.json` (`harness.ImageInfo`): `contract`, `flavor`, `daemonVersion`, `playwrightMcp` (command), and per agent its command, version and ACP command/args |
