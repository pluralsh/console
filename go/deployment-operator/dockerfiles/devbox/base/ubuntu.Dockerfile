# syntax=docker/dockerfile:1.10
#
# A minimal devbox environment image on Ubuntu: only what the devbox contract needs, for teams that want their
# own distribution and toolchain instead of devbox-minimal's. Extend it (FROM it) or copy it. The coding agents,
# Playwright MCP and devbox-daemon come from the plural-runtime sidecar, so the image needs none of them. See
# https://docs.plural.sh/plural-features/devboxes/environment-images. Build context: ./go
#
#   docker build -f deployment-operator/dockerfiles/devbox/base/ubuntu.Dockerfile go

# renovate: datasource=docker depName=ubuntu
ARG UBUNTU_IMAGE=ubuntu:24.04
FROM ${UBUNTU_IMAGE}

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# What the runtime's agents and the daemon use from the image: glibc and libstdc++ (in the base), CA
# certificates, git, and a shell. Chromium (DEVBOX_CHROMIUM) only if the runner enables the browser.
# hadolint ignore=DL3008
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      bash ca-certificates curl git openssh-client less procps && \
    rm -rf /var/lib/apt/lists/*

# The shell setup the daemon's terminals source: cloud identities and the runtime's agents on PATH.
COPY deployment-operator/dockerfiles/devbox/rootfs/minimal/usr/local/lib/devbox/ /usr/local/lib/devbox/
COPY deployment-operator/dockerfiles/devbox/rootfs/minimal/etc/profile.d/devbox.sh /etc/profile.d/devbox.sh
COPY deployment-operator/dockerfiles/devbox/rootfs/minimal/etc/devbox/skel/ /etc/devbox/skel/
# Claude Code's own sandbox off: the devbox is the sandbox, and Claude's breaks downloads through the egress proxy.
COPY deployment-operator/dockerfiles/devbox/rootfs/minimal/etc/claude-code/ /etc/claude-code/

# The dev user is UID 1000 (Ubuntu's own ubuntu user has that UID, so it goes). Its home is the workspace volume,
# so nothing is written under it here; the daemon seeds it from /etc/devbox/skel on first boot.
RUN if id ubuntu >/dev/null 2>&1; then userdel --remove ubuntu; fi && \
    groupadd --gid 1000 dev && \
    useradd --uid 1000 --gid 1000 --no-create-home --home-dir /home/dev --shell /bin/bash dev && \
    install -d -o 1000 -g 1000 -m 0755 /home/dev && \
    chmod -R a+rX /etc/devbox /etc/claude-code /usr/local/lib/devbox && \
    install -d -o 1000 -g 1000 -m 0755 /var/lib/devbox /var/lib/devbox/trust && \
    ln -s /etc/ssl/certs/ca-certificates.crt /var/lib/devbox/trust/ca-bundle.pem && \
    chown -h 1000:1000 /var/lib/devbox/trust/ca-bundle.pem && \
    install -d -o 1000 -g 1000 -m 0755 /run/plural /run/plural/identity && \
    install -d -o 1000 -g 1000 -m 0700 /run/plural/agent-auth && \
    install -d -m 0755 /etc/devbox && \
    printf '{"contract":"v1","flavor":"base-ubuntu","agents":{}}\n' > /etc/devbox/image.json

LABEL sh.plural.devbox/contract="v1" \
      sh.plural.devbox/flavor="base-ubuntu"

ENV HOME=/home/dev \
    USER=dev \
    SHELL=/bin/bash \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    DEVBOX_CONTRACT=v1 \
    DEVBOX_SKEL_DIR=/etc/devbox/skel \
    DEVBOX_TRUST_DIR=/var/lib/devbox/trust \
    DEVBOX_IDENTITY_DIR=/run/plural/identity \
    SSL_CERT_FILE=/var/lib/devbox/trust/ca-bundle.pem \
    NODE_EXTRA_CA_CERTS=/var/lib/devbox/trust/ca-bundle.pem \
    REQUESTS_CA_BUNDLE=/var/lib/devbox/trust/ca-bundle.pem \
    CURL_CA_BUNDLE=/var/lib/devbox/trust/ca-bundle.pem \
    GIT_SSL_CAINFO=/var/lib/devbox/trust/ca-bundle.pem

USER 1000:1000
WORKDIR /home/dev
