# syntax=docker/dockerfile:1
#
# ghcr.io/pluralsh/repository-prebake uses the same DHI Debian Trixie base as
# agent-harness, with git, mise, a C
# toolchain for precompile, and the prebake CLI. Extend it, RUN prebake at
# build time, and push with a normal docker build / build-push-action.
#
# prebake reads repos.yaml, clones each repo into /data/<path> (or keeps a
# COPY'd checkout that already has .git), and writes /data/manifest.json.
# --dest defaults to /data; the agent-run init container copies that tree
# into the pod. --chown 65532:65532 so the non-root agent can read it.
#
# Extra compile/install steps belong after prebake and must write under
# /data/<path> (_build, node_modules, in-tree Go caches). Anything outside
# /data is not copied into the pod. Private HTTPS remotes: mount a BuildKit
# secret and set GIT_ACCESS_TOKEN or GIT_PASSWORD (optional GIT_USERNAME,
# default x-access-token). Do not put tokens in repos.yaml.
#
#   FROM docker.io/pluralsh/repository-prebake:latest
#   COPY repos.yaml /config/repos.yaml
#   RUN --mount=type=secret,id=git_token \
#       GIT_ACCESS_TOKEN="$(cat /run/secrets/git_token)" \
#       prebake --config /config/repos.yaml --chown 65532:65532
#   WORKDIR /data/repo
#   RUN mix deps.get && MIX_ENV=test mix compile   # optional; mise is on PATH
#   RUN chown -R 65532:65532 /data
#
# Build from this repo (context is the Go module):
#   docker build -f repository-prebake/base/Dockerfile \
#     -t docker.io/pluralsh/repository-prebake:local go/repository-prebake

ARG GO_VERSION=1.27.1
ARG MISE_VERSION=v2026.9.7
ARG FCP_VERSION=0.2.2

FROM golang:${GO_VERSION}-bookworm AS cli
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /prebake ./cmd/prebake

FROM rust:1.90-bookworm AS fcp
ARG FCP_VERSION
RUN cargo install fcp --version "${FCP_VERSION}" --locked --root /opt/fcp

FROM dhi.io/debian-base:trixie-dev
ARG MISE_VERSION
ENV DEBIAN_FRONTEND=noninteractive \
    MISE_YES=1
RUN set -eux; \
    for attempt in 1 2 3 4 5; do \
      rm -rf /var/lib/apt/lists/*; \
      if apt-get update && apt-get install -y --no-install-recommends \
           ca-certificates \
           git \
           curl \
           bash \
           build-essential \
           autoconf \
           m4 \
           libssl-dev \
           libncurses-dev \
           unixodbc-dev \
           unzip \
           python3 \
           pkg-config; then \
        break; \
      fi; \
      if [ "${attempt}" -eq 5 ]; then \
        echo "apt-get install failed after ${attempt} attempts" >&2; \
        exit 1; \
      fi; \
      sleep "${attempt}"; \
    done; \
    rm -rf /var/lib/apt/lists/*; \
    curl -fsSL https://mise.run | MISE_VERSION="${MISE_VERSION#v}" MISE_INSTALL_PATH=/usr/local/bin/mise sh; \
    mise --version
COPY --from=cli /prebake /usr/local/bin/prebake
COPY --from=fcp /opt/fcp/bin/fcp /usr/local/bin/fcp
WORKDIR /data
