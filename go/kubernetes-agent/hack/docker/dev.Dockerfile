# Multi-binary Debug Dockerfile for kubernetes-agent with Delve
# Builds: api, kas, and agentk binaries with debug symbols for remote debugging
# Usage: docker run <image> [api|kas|agentk] [args...]

# Get busybox shell for distroless
FROM busybox:uclibc AS busybox

# Builder stage for all binaries with debug support
FROM golang:1.25-alpine3.22 AS builder

ARG TARGETARCH
ARG TARGETOS
ARG VERSION=dev
ARG GIT_COMMIT=unknown
ARG BUILD_TIME

# Install delve
RUN go install github.com/go-delve/delve/cmd/dlv@latest

WORKDIR /src

# Copy entire source tree to preserve directory structure for debugging
COPY . .

# Build API binary with debug symbols
WORKDIR /src/modules/api
RUN go mod download
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build \
    -gcflags="all=-N -l" \
    -ldflags="-X github.com/pluralsh/kubernetes-agent/api/pkg/environment.Version=${VERSION}" \
    -o /binaries/api .

# Build KAS and AGENTK binaries with debug symbols
WORKDIR /src/modules/kas
RUN go mod download

# Build kas binary with debug symbols
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build \
    -gcflags="all=-N -l" \
    -ldflags="-X 'github.com/pluralsh/kubernetes-agent/cmd.Version=${VERSION}' \
        -X 'github.com/pluralsh/kubernetes-agent/cmd.Commit=${GIT_COMMIT}' \
        -X 'github.com/pluralsh/kubernetes-agent/cmd.BuildTime=${BUILD_TIME}'" \
    -o /binaries/kas ./cmd/kas

# Build agentk binary with debug symbols
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build \
    -gcflags="all=-N -l" \
    -ldflags="-X 'github.com/pluralsh/kubernetes-agent/cmd.Version=${VERSION}' \
        -X 'github.com/pluralsh/kubernetes-agent/cmd.Commit=${GIT_COMMIT}' \
        -X 'github.com/pluralsh/kubernetes-agent/cmd.BuildTime=${BUILD_TIME}'" \
    -o /binaries/agentk ./cmd/agentk

# Final stage - distroless base with shell and delve
FROM gcr.io/distroless/base-debian12:nonroot AS final

LABEL source="https://github.com/pluralsh/kubernetes-agent" \
      name="Kubernetes Agent Multi-Binary Debug" \
      maintainer="Plural::sre" \
      vendor="Plural" \
      summary="Kubernetes Agent Multi-Binary Debug Image" \
      description="Unified debug image containing api, kas, and agentk binaries with Delve support for Plural CD"

# Copy the static shell into base image for running delve
COPY --from=busybox /bin/sh /bin/sh

# Copy delve debugger
COPY --from=builder /go/bin/dlv /dlv

# Copy all binaries from builder
COPY --from=builder /binaries/api /api
COPY --from=builder /binaries/kas /kas
COPY --from=builder /binaries/agentk /agentk

# Copy source code for debugger source path mapping
COPY --from=builder /src /src

# Copy entrypoint scripts
COPY hack/docker/entrypoint.debug.sh /entrypoint.sh

# Environment variable for application flags
ENV APP_FLAGS=""

# Default to kas for backward compatibility
ENTRYPOINT ["/entrypoint.sh"]