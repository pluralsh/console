# syntax=docker/dockerfile:1
#
# Targets:
#   base     (default) — git + prebake CLI. Users extend this image and RUN prebake.
#   console            — pluralsh/console checkout plus compile caches.
#
#   docker build -f repository-prebake/Dockerfile --target base -t ghcr.io/pluralsh/repository-prebake .
#   docker build -f repository-prebake/Dockerfile --target console -t ghcr.io/pluralsh/console-repos .
#
# Console builds should use repository-prebake/console.dockerignore as the
# context ignore file (CI copies it over .dockerignore).

ARG GO_VERSION=1.27.1
ARG MISE_VERSION=v2026.9.7

FROM golang:${GO_VERSION}-bookworm AS cli
WORKDIR /src
COPY go/repository-prebake/go.mod go/repository-prebake/go.sum ./
RUN go mod download
COPY go/repository-prebake/ ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /prebake ./cmd/prebake

FROM debian:bookworm-slim AS runtime
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates \
      git \
    && rm -rf /var/lib/apt/lists/*
COPY --from=cli /prebake /usr/local/bin/prebake
WORKDIR /data

FROM runtime AS console
ARG MISE_VERSION
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl \
      bash \
      build-essential \
      autoconf \
      m4 \
      libssl-dev \
      libncurses5-dev \
      unixodbc-dev \
      unzip \
      python3 \
      pkg-config \
    && rm -rf /var/lib/apt/lists/* \
    && curl -fsSL https://mise.run | MISE_VERSION="${MISE_VERSION#v}" MISE_INSTALL_PATH=/usr/local/bin/mise sh \
    && mise --version

ENV MISE_YES=1 \
    MISE_TRUSTED_CONFIG_PATHS=/data/console \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    ELIXIR_ERL_OPTIONS="+fnu" \
    PRECOMPILE_ROOT=/data/console

COPY repository-prebake/repos.yaml /config/repos.yaml
COPY repository-prebake/precompile.sh /usr/local/bin/precompile.sh
COPY . /data/console
RUN chmod +x /usr/local/bin/precompile.sh \
 && git config --global --add safe.directory /data/console \
 && prebake --config /config/repos.yaml --dest /data \
 && precompile.sh \
 && chown -R 65532:65532 /data

USER 65532

FROM runtime AS base
