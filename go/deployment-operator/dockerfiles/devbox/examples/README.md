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
  base).
- It has a POSIX shell at `/bin/sh`. The operator starts the container with it
  to launch `devbox-daemon`, so `ENTRYPOINT` and `CMD` are not used. If your
  image keeps its shell elsewhere, set `spec.runtime.shell` on the runner.
- Every agent in `spec.agents` is present and passes the ACP probe.
- The `dev` user is UID 1000, and the trust directory `/var/lib/devbox/trust` is
  writable by it.

## The daemon is not yours to maintain

`devbox-daemon` is delivered by the deployment operator, in a sidecar next to
your image, so you never rebuild to pick up a daemon fix: upgrading the operator
is enough. The daemon in the base image is ignored.

When the daemon or your image changes, the runner rolls a new template
revision. New instances start on it. Existing instances are **updated**, which
restarts them on the new revision:

- Kept: the home directory (`/home/dev`: repositories, dotfiles, agent
  history) and the instance's threads.
- Lost: running processes, and anything changed outside the home directory
  since the instance started (packages installed with `sudo apt`, files under
  `/usr/local` or `/opt`). The root filesystem is the image's again.

`spec.instanceUpdatePolicy.mode` on the runner says when that happens:
`onResume` (the default) updates a suspended instance the next time it is
resumed; `manual` leaves instances alone until a user updates theirs or an admin
updates the box from Settings. An admin can also force an update for a
security fix, which restarts instances in use after warning their users.

Users who need something outside their home after every restart can put the
commands in `~/.config/devbox/boot.sh`. The daemon runs it with `sh`, as `dev`,
whenever an existing instance cold-boots (5 minute limit, output in
`~/.plural/boot.log`); a failure is reported on the instance and never stops
it from starting. Better still, put it in the image.

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
