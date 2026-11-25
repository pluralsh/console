# syntax=docker/dockerfile:1.10
#
# A minimal devbox environment image on Red Hat UBI 9: only what the devbox contract needs, for teams that
# standardize on RHEL. Extend it (FROM it) or copy it. The coding agents, Playwright MCP and devbox-daemon come
# from the plural-runtime sidecar, so the image needs none of them. See
# https://docs.plural.sh/plural-features/devboxes/environment-images. Build context: ./go
#
#   docker build -f deployment-operator/dockerfiles/devbox/base/ubi.Dockerfile go

# renovate: datasource=docker depName=registry.access.redhat.com/ubi9/ubi-minimal
ARG UBI_IMAGE=registry.access.redhat.com/ubi9/ubi-minimal:latest
FROM ${UBI_IMAGE}

# What the runtime's agents and the daemon use from the image: glibc and libstdc++, CA certificates, git, and a
# shell. shadow-utils only to create the dev user.
RUN microdnf install -y --nodocs --setopt=install_weak_deps=0 \
      bash ca-certificates git-core libstdc++ less openssh-clients procps-ng shadow-utils tar && \
    microdnf clean all

COPY deployment-operator/dockerfiles/devbox/rootfs/minimal/usr/local/lib/devbox/ /usr/local/lib/devbox/
COPY deployment-operator/dockerfiles/devbox/rootfs/minimal/etc/profile.d/devbox.sh /etc/profile.d/devbox.sh
COPY deployment-operator/dockerfiles/devbox/rootfs/minimal/etc/devbox/skel/ /etc/devbox/skel/

# The dev user is UID 1000; its home is the workspace volume, seeded from /etc/devbox/skel on first boot.
RUN groupadd --gid 1000 dev && \
    useradd --uid 1000 --gid 1000 --no-create-home --home-dir /home/dev --shell /bin/bash dev && \
    install -d -o 1000 -g 1000 -m 0755 /home/dev && \
    chmod -R a+rX /etc/devbox /usr/local/lib/devbox && \
    install -d -o 1000 -g 1000 -m 0755 /var/lib/devbox /var/lib/devbox/trust && \
    ln -s /etc/pki/tls/certs/ca-bundle.crt /var/lib/devbox/trust/ca-bundle.pem && \
    chown -h 1000:1000 /var/lib/devbox/trust/ca-bundle.pem && \
    install -d -o 1000 -g 1000 -m 0755 /run/plural /run/plural/identity && \
    install -d -o 1000 -g 1000 -m 0700 /run/plural/agent-auth && \
    printf '{"contract":"v1","flavor":"base-ubi","agents":{}}\n' > /etc/devbox/image.json

LABEL sh.plural.devbox/contract="v1" \
      sh.plural.devbox/flavor="base-ubi"

# RHEL keeps the system CA bundle at another path than Debian, which the daemon defaults to.
ENV HOME=/home/dev \
    USER=dev \
    SHELL=/bin/bash \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    DEVBOX_CONTRACT=v1 \
    DEVBOX_SKEL_DIR=/etc/devbox/skel \
    DEVBOX_TRUST_DIR=/var/lib/devbox/trust \
    DEVBOX_IDENTITY_DIR=/run/plural/identity \
    DEVBOX_SYSTEM_CA_BUNDLE=/etc/pki/tls/certs/ca-bundle.crt \
    SSL_CERT_FILE=/var/lib/devbox/trust/ca-bundle.pem \
    NODE_EXTRA_CA_CERTS=/var/lib/devbox/trust/ca-bundle.pem \
    REQUESTS_CA_BUNDLE=/var/lib/devbox/trust/ca-bundle.pem \
    CURL_CA_BUNDLE=/var/lib/devbox/trust/ca-bundle.pem \
    GIT_SSL_CAINFO=/var/lib/devbox/trust/ca-bundle.pem

USER 1000:1000
WORKDIR /home/dev
