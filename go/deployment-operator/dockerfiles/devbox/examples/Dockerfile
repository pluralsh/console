# A custom devbox image built on devbox-minimal (section 4.1a). Use devbox-fat
# instead to start from the full toolchain. Pin the base to your console's
# release line (for example ghcr.io/pluralsh/devbox-minimal:0.12.3) or a digest.
ARG BASE_IMAGE=ghcr.io/pluralsh/devbox-minimal:latest
# hadolint ignore=DL3006
FROM ${BASE_IMAGE}

USER root
# The base sets HOME=/home/dev; keep root's caches (npm, pip, ...) out of it.
ENV HOME=/root

# System packages. Tools go under /usr or /usr/local, never /home/dev: the home
# directory is the workspace volume, so anything written there is hidden.
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends postgresql-client && \
    rm -rf /var/lib/apt/lists/*

# Internal CAs. The daemon builds its trust bundle from the system store at boot,
# so every runtime trusts these as well as the egress gateway's CA.
# COPY internal-ca.crt /usr/local/share/ca-certificates/
# RUN update-ca-certificates

# Default dotfiles, seeded into /home/dev on first boot without overwriting
# the user's own files.
COPY --chown=1000:1000 dotfiles/ /etc/devbox/skel/

# Back to the dev user. Don't override ENTRYPOINT: devbox-daemon must stay PID 1.
# For startup work, use the DevboxRunner's bootstrap script instead.
ENV HOME=/home/dev
USER dev
