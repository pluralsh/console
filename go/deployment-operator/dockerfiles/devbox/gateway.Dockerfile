# syntax=docker/dockerfile:1.10
#
# ghcr.io/pluralsh/devbox-gateway: the per-cluster devbox gateway (DBX-49). No
# agents or toolchains, just the binary on distroless. Build context: ./go
#
#   docker build -f deployment-operator/dockerfiles/devbox/gateway.Dockerfile go
#
# GATEWAY_SOURCE=stub swaps in a placeholder health server for local testing.
#
# The runtime is distroless/base, not static: the binary links gomonty (through
# the agent run packages), whose purego FFI makes even a CGO_ENABLED=0 build
# dynamically linked against glibc's loader.

ARG GO_IMAGE=golang:1.27.2-trixie
ARG RUNTIME_IMAGE=gcr.io/distroless/base-debian13:nonroot
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

RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} \
    go build -trimpath \
      -ldflags="-s -w -X main.version=${VERSION}" \
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
