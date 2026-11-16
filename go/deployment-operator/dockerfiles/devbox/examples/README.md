# Custom devbox images

`DevboxRunner.spec.image` accepts any image that meets the devbox image contract.
The supported way to meet it is to build on one of Plural's images:

- `ghcr.io/pluralsh/devbox-minimal`: the daemon, every harness, the browser stack
  and an interactive shell. The smallest base.
- `ghcr.io/pluralsh/devbox-fat`: `devbox-minimal` plus Go, Rust, Java, .NET,
  Node/TypeScript and Python toolchains, DevOps tools and cloud CLIs.

Both are tagged with the console release version (`0.12.3`), its minor line
(`0.12`), and are signed by digest.

## Files here

- `Dockerfile`: a custom image `FROM devbox-minimal` that adds a package, an
  optional internal CA and default dotfiles.
- `dotfiles/`: copied to `/etc/devbox/skel/`, which the daemon seeds into the
  home directory on first boot.
- `build-and-bump.yaml`: a GitHub Actions workflow that builds and pushes the
  image for amd64 and arm64, then pins your `DevboxRunner` manifest to the new
  digest.

Build it locally with:

```bash
docker build --build-arg BASE_IMAGE=ghcr.io/pluralsh/devbox-minimal:0.12 -t my-devbox .
```

## Image contract (v1)

The golden boot checks these, and stops the template revision with a clear
condition if one fails:

- The image keeps the `sh.plural.devbox/contract=v1` label (inherited from the
  base) and `devbox-daemon` as its entrypoint. Don't override `ENTRYPOINT`; use
  the runner's bootstrap script for startup work.
- The daemon comes from the same console release line as the operator. Images
  more than one minor release behind are flagged; rebuild on the new base.
- Every agent in `spec.agents` is present and passes the ACP probe.
- The `dev` user is UID 1000, and the trust directory `/var/lib/devbox/trust` is
  writable by it.

## Rules of thumb

- `/home/dev` is the workspace volume. Anything the image writes there is hidden
  at runtime. Install tools under `/usr/local` or `/opt`, and put default
  dotfiles in `/etc/devbox/skel/`. The base images set `HOME=/home/dev`, so set
  `ENV HOME=/root` after `USER root` (and back before `USER dev`); otherwise
  root's npm, pip or dotnet caches land, root-owned, in the home directory.
- Add CAs with `update-ca-certificates`. The daemon combines the system store
  with the egress gateway's CA into `/var/lib/devbox/trust/ca-bundle.pem`, which
  `SSL_CERT_FILE`, `NODE_EXTRA_CA_CERTS`, `REQUESTS_CA_BUNDLE`, `GIT_SSL_CAINFO`
  and friends point at.
- Never bake secrets into the image. SCM, AI proxy and console credentials are
  injected by the egress gateway; cloud access uses federated tokens.
- Small additions (a CLI, a mise tool) can go in the runner's bootstrap script or
  mise config instead. They run once during the golden boot and are captured in
  the golden snapshot.
- Private registries need node-level pull credentials; see the Substrate chart's
  image credential provider presets.
