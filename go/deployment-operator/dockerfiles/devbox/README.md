# Devbox images

Dockerfiles for the devbox sandbox and gateway images (DBX-49). All builds use
`./go` as the context, like the other deployment operator images.

| Image | Dockerfile | Contents |
|---|---|---|
| `ghcr.io/pluralsh/devbox-minimal` | `minimal.Dockerfile` | `devbox-daemon` (PID 1), every harness and ACP adapter, Node, Chromium, Xvfb, voxl, Playwright MCP, shell tools, `mise` |
| `ghcr.io/pluralsh/devbox-fat` | `fat.Dockerfile` | `devbox-minimal` plus language toolchains, DevOps tools, cloud CLIs and rootless Podman (`docker` and `docker compose` map onto it) |
| `ghcr.io/pluralsh/devbox-gateway` | `gateway.Dockerfile` | `devbox-gateway` on distroless |
| `ghcr.io/pluralsh/devbox-voxl` | `voxl.Dockerfile` | a statically linked `voxl` at `/voxl` (amd64, arm64), which `devbox-minimal` copies |

`devbox-voxl` is published by `.github/workflows/devbox-voxl.yaml`, tagged with
voxl's version, from master (or a pull request that introduces a new version);
bump `VOXL_IMAGE` in `minimal.Dockerfile` with `VOXL_VERSION`. Its build context
is `dockerfiles/devbox`.

Published by `.github/workflows/deployment-operator-cd-devbox.yaml` on
`go/deployment-operator/v*` tags, with `X.Y.Z` and `X.Y` tags, cosign-signed by
digest. The same workflow builds pull requests (`pr-<number>` and `sha-<sha>`
tags), runs `test.sh` against each pushed digest (`MINIMAL_IMAGE`, `FAT_IMAGE`,
`GATEWAY_IMAGE`) and caches layers in `ghcr.io/pluralsh/console-cache`.
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
- `examples/`: a sample custom image `FROM devbox-minimal`.

## Testing

```bash
./test.sh                    # versions, lint, minimal, gateway, fat-check
./test.sh fat example        # full fat build and the example image (several GB)
DAEMON_SOURCE=stub ./test.sh minimal
```

`versions` fails if the harness pins drift from `dockerfiles/agent-harness`.
`lint` runs hadolint, `fat-check` runs `docker buildx build --check`, and the
build steps run container-structure-test plus a runtime check that the daemon is
PID 1, answers `/readyz` and exits promptly on `SIGTERM`. Test images are removed
afterwards unless `KEEP_IMAGES=1`.

## Contract with devbox-daemon

| What | Value |
|---|---|
| Entrypoint | `/usr/local/bin/devbox-daemon`, PID 1, user `dev` (1000:1000), cwd `/home/dev` |
| Listen | `:80` (`EXPOSE 80`); `HEALTHCHECK` probes `GET /readyz` |
| Labels | `sh.plural.devbox/contract=v1`, `sh.plural.devbox/daemon-version=<version>`, `sh.plural.devbox/flavor=minimal\|fat` |
| Version | `-X main.version=<version>` at link time; same value as the label |
| Skeleton | `/etc/devbox/skel/` (`$DEVBOX_SKEL_DIR`), copied into `/home/dev` on first boot without overwriting |
| Trust store | `/var/lib/devbox/trust/` (`$DEVBOX_TRUST_DIR`, owned by `dev`). Write `ca-bundle.pem` = `/etc/ssl/certs/ca-certificates.crt` + egress CA, replacing the build-time symlink. In `devbox-fat`, also import the egress CA into `java-cacerts` (PKCS12, password `changeit`) |
| Identities | `/run/plural/identity/<name>/token` (`$DEVBOX_IDENTITY_DIR`) plus `/run/plural/identity/env`, `KEY=value` lines loaded by shells and the cloud CLI wrappers |
| Subscription credentials | `/run/plural/agent-auth/` (the daemon's `--agent-auth-dir` default, mode 0700), e.g. `codex/auth.json` |
| Browser | `$DEVBOX_CHROMIUM` (`/usr/bin/chromium`), `Xvfb`, `voxl` (streams the display as H.264), `DISPLAY=:99`, `playwright-mcp` |
| Agents | `/etc/devbox/image.json` (`harness.ImageInfo`): `contract`, `flavor`, `daemonVersion`, `playwrightMcp` (command), and per agent its command, version and ACP command/args |
