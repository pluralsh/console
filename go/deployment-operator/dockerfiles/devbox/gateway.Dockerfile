# syntax=docker/dockerfile:1.10
#
# ghcr.io/pluralsh/devbox-gateway: the per-cluster devbox gateway (DBX-49). No
# agents or toolchains, just the binary on a Docker Hardened Image. Build
# context: ./go (pulling from dhi.io needs `docker login dhi.io`)
#
#   docker build -f deployment-operator/dockerfiles/devbox/gateway.Dockerfile go
#
# GATEWAY_SOURCE=stub swaps in a placeholder health server for local testing.
#
# The runtime has a libc, unlike dhi.io/static: the binary links gomonty
# (through the agent run packages), whose purego FFI makes even a CGO_ENABLED=0
# build dynamically linked. -tags musl embeds gomonty's musl library, and -I
# sets musl's loader: Go only picks it up from the build host, which isn't the
# target architecture when cross-compiling, and otherwise defaults to glibc's.

ARG GO_IMAGE=dhi.io/golang:1.27.3-alpine3.23-dev
ARG RUNTIME_IMAGE=dhi.io/alpine-base:3.23
ARG GATEWAY_SOURCE=build

FROM --platform=${BUILDPLATFORM} ${GO_IMAGE} AS gateway-build

ARG TARGETARCH
ARG TARGETOS
ARG VERSION=dev

WORKDIR /workspace
COPY client /workspace/client
COPY polly /workspace/polly

WORKDIR /workspace/deployment-operator
COPY deployment-operator/go.* ./
RUN go mod download

COPY deployment-operator/cmd/ ./cmd
COPY deployment-operator/pkg ./pkg
COPY deployment-operator/internal ./internal
COPY deployment-operator/api ./api

RUN case "${TARGETARCH}" in \
      amd64) ldso=/lib/ld-musl-x86_64.so.1 ;; \
      arm64) ldso=/lib/ld-musl-aarch64.so.1 ;; \
      *) echo "unsupported TARGETARCH ${TARGETARCH}" >&2; exit 1 ;; \
    esac && \
    CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} \
    go build -trimpath -tags musl \
      -ldflags="-s -w -I ${ldso} -X main.version=${VERSION}" \
      -o /out/devbox-gateway \
      ./cmd/devbox-gateway

FROM --platform=${BUILDPLATFORM} ${GO_IMAGE} AS gateway-stub

ARG TARGETARCH
ARG TARGETOS
ARG VERSION=dev

WORKDIR /src
COPY deployment-operator/dockerfiles/devbox/stub/ ./
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} GOWORK=off \
    go build -trimpath -ldflags="-s -w -X main.version=${VERSION}-stub" -o /out/devbox-gateway .

# hadolint ignore=DL3006
FROM gateway-${GATEWAY_SOURCE} AS gateway

# hadolint ignore=DL3006
FROM ${RUNTIME_IMAGE}

ARG VERSION=dev

COPY --from=gateway /out/devbox-gateway /devbox-gateway

LABEL sh.plural.devbox/component="gateway" \
      sh.plural.devbox/version="${VERSION}"

USER 65532:65532

ENTRYPOINT ["/devbox-gateway"]
