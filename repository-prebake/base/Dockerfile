# syntax=docker/dockerfile:1
#
# ghcr.io/pluralsh/repository-prebake is a Debian image with git and the
# prebake CLI. Extend it, RUN prebake at build time, and push with a normal
# docker build / build-push-action.
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
#   FROM ghcr.io/pluralsh/repository-prebake:latest
#   COPY repos.yaml /config/repos.yaml
#   RUN --mount=type=secret,id=git_token \
#       GIT_ACCESS_TOKEN="$(cat /run/secrets/git_token)" \
#       prebake --config /config/repos.yaml --chown 65532:65532
#   WORKDIR /data/repo
#   RUN mix deps.get && MIX_ENV=test mix compile   # optional
#   RUN chown -R 65532:65532 /data
#
# Build from this repo (context is the Go module):
#   docker build -f repository-prebake/base/Dockerfile \
#     -t ghcr.io/pluralsh/repository-prebake:local go/repository-prebake

ARG GO_VERSION=1.27.1

FROM golang:${GO_VERSION}-bookworm AS cli
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /prebake ./cmd/prebake

FROM debian:bookworm-slim
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates \
      git \
    && rm -rf /var/lib/apt/lists/*
COPY --from=cli /prebake /usr/local/bin/prebake
WORKDIR /data
