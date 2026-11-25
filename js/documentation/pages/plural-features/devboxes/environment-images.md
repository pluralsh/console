---
title: Environment images
description: What a custom devbox environment image needs, and the base images to build one from
---

## Overview

A devbox instance runs two images side by side:

* The **environment image** (`spec.image` of the `DevboxRunner`) is what you and the agents work in: your distribution, toolchains, CLIs and, optionally, a browser. It defaults to `ghcr.io/pluralsh/devbox-fat`.
* The **runtime image** comes with the deployment operator. It carries the devbox daemon, the coding agents (Claude Code, Codex, OpenCode, Gemini CLI and pi) with their ACP adapters, Playwright MCP, and the Node.js they run on. Each operator release delivers its daemon and agents to every runner, whatever environment image the runner uses.

When an instance starts, the runtime installs the daemon and the agents listed in the runner's `spec.agents` into the instance's home volume, and the environment image runs them from there. Your image therefore doesn't need to ship any agent, and agent updates don't require rebuilding it.

Only the runner's own agents are installed, because everything installed lands in every instance's home and snapshots, and counts against a JuiceFS home's quota (`spec.home.size`). As a rough guide on amd64, Claude Code and Codex take about 320 MB each, OpenCode 180 MB, pi 180 MB, Gemini CLI 100 MB, and the Node.js they share 120 MB. The daemon adds about 20 MB, and Playwright MCP about 20 MB with the browser enabled.


## Requirements

An image can be a runner's environment image when it meets all of these:

| Requirement | Why |
|---|---|
| `linux/amd64` or `linux/arm64` | The runtime is built for these platforms. |
| glibc 2.28 or newer, with libstdc++ | The agents are the upstream binaries, unmodified, and Node.js is the official build. This covers Debian 10+, Ubuntu 20.04+, RHEL and UBI 8+ and Amazon Linux 2023, but not Amazon Linux 2 or CentOS 7. Alpine and other musl-based images are not supported. |
| A POSIX shell at `/bin/sh`, with `sleep` | The instance starts with it to wait for the runtime and hand over to the daemon. If your shell is elsewhere, set `spec.runtime.shell`. |
| The `sh.plural.devbox/contract=v1` label | It marks the image as built for devboxes. |
| `USER 1000:1000`, with `/home/dev` as its home | The daemon, the agents and the terminals run as this user, and the home is the instance's workspace volume. Declare the user numerically. |
| `DEVBOX_TRUST_DIR` set to a directory owned by UID 1000 (for example `/var/lib/devbox/trust`) | The daemon writes the CA bundle there, including the CA of the egress proxy. |

The operator checks the label, the user and `DEVBOX_TRUST_DIR` when it resolves the image, and doesn't build a revision for an image that fails them. The other requirements are verified when the operator boots each new revision's golden instance, before the revision serves: a revision that fails them never reaches your instances, and the previous one keeps serving.

These are optional but recommended:

* **The devbox shell setup.** Copy `/etc/profile.d/devbox.sh` and `/usr/local/lib/devbox/devbox.sh` from one of the images below. Login shells reset `PATH`; the setup puts the agents back on it in terminals and loads the instance's cloud identities. Without it, agents still work, but `claude`, `codex` and the other CLIs are missing from terminals, or resolve to copies of your own.
* **Chromium and Xvfb**, if the runner enables the browser: Chromium at `$DEVBOX_CHROMIUM` (default `/usr/bin/chromium`), plus `Xvfb` and `x11vnc`. Playwright MCP comes from the runtime.
* **A system CA bundle at `/etc/ssl/certs/ca-certificates.crt`**, or `DEVBOX_SYSTEM_CA_BUNDLE` pointing at yours (for example `/etc/pki/tls/certs/ca-bundle.crt` on RHEL).
* **Claude Code's managed settings** at `/etc/claude-code/managed-settings.json`, turning Claude's own sandbox off (`{"sandbox": {"enabled": false}}`): the devbox is the sandbox, and Claude's breaks downloads through the egress proxy. Without the file, the daemon sets the same default in the user's Claude settings, which users can change.
* **Skeleton dotfiles** in `/etc/devbox/skel` (or `$DEVBOX_SKEL_DIR`). They're copied into the home on first boot without overwriting your files.

Nothing in the image's `ENTRYPOINT` or `CMD` is used, and nothing should be written under `/home/dev` at build time: the home is a volume, so it hides whatever the image puts there.


## Base images

Pick the one closest to what your team uses and build `FROM` it:

| Image | What it is |
|---|---|
| `ghcr.io/pluralsh/devbox-fat` | Everything in `devbox-minimal` plus language toolchains, DevOps tools, cloud CLIs and rootless Podman. The default. |
| `ghcr.io/pluralsh/devbox-minimal` | Debian with shell tools, git, `gh`, `glab`, `mise`, Chromium and the devbox shell setup. |
| [`base/ubuntu.Dockerfile`](https://github.com/pluralsh/console/blob/master/go/deployment-operator/dockerfiles/devbox/base/ubuntu.Dockerfile) | Ubuntu 24.04 with only the requirements above. Copy it or build it yourself. |
| [`base/ubi.Dockerfile`](https://github.com/pluralsh/console/blob/master/go/deployment-operator/dockerfiles/devbox/base/ubi.Dockerfile) | Red Hat UBI 9 with only the requirements above. Copy it or build it yourself. |

A custom image on top of `devbox-minimal` looks like this:

```dockerfile
FROM ghcr.io/pluralsh/devbox-minimal:<your operator version>

USER root
# Keep root's caches out of /home/dev, which is the workspace volume.
ENV HOME=/root
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends postgresql-client && \
    rm -rf /var/lib/apt/lists/*

# Internal CAs: the daemon builds its trust bundle from the system store at boot.
# COPY internal-ca.crt /usr/local/share/ca-certificates/
# RUN update-ca-certificates

# Default dotfiles, seeded into /home/dev on first boot.
# COPY --chown=1000:1000 dotfiles/ /etc/devbox/skel/

ENV HOME=/home/dev
USER 1000:1000
```

Point the runner at it with `spec.image`. A tag is re-resolved hourly by default; a digest stays pinned (see `spec.imageUpdatePolicy`).


## Troubleshooting

The runner's status conditions say what went wrong:

| Symptom | Cause |
|---|---|
| The revision is not built, with a message about a label, the user or `DEVBOX_TRUST_DIR` | The image misses one of the checked requirements. |
| The revision fails its golden boot with a hint about the shell | There is no POSIX shell at `/bin/sh` (or at `spec.runtime.shell`). |
| The revision fails because every agent is missing, with "the environment image has no glibc" | The image is musl-based, such as Alpine. Rebuild it on a glibc distribution. |
| The `AgentProbe` condition warns that agents fail to start, with `GLIBC_2.28 not found` or a missing `libstdc++.so.6` in the message | The image's glibc is older than 2.28 (for example Amazon Linux 2 or CentOS 7), or it has no libstdc++. |
| Agents work, but `claude` or `codex` aren't found in terminals | The image doesn't have the devbox shell setup; copy it as described above. |
