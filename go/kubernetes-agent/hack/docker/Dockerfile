# Multi-binary Dockerfile for kubernetes-agent
# Builds: api, kas, and agentk binaries in a single image
# Usage: docker run <image> [api|kas|agentk] [args...]

# Builder stage for all binaries
FROM golang:1.27.3-alpine AS builder

ARG TARGETARCH
ARG TARGETOS
ARG VERSION=dev
ARG GIT_COMMIT=unknown
ARG BUILD_TIME

WORKDIR /workspace

# Expect build context to be /go so local modules (e.g. polly) are available.

# Copy API module (preserve repo layout for local module replaces)
COPY kubernetes-agent/api/go.mod kubernetes-agent/api/go.sum ./kubernetes-agent/api/
COPY kubernetes-agent/api/main.go ./kubernetes-agent/api/
COPY kubernetes-agent/api/pkg ./kubernetes-agent/api/pkg

# Copy KAS module (includes both kas and agentk)
COPY kubernetes-agent/kas/go.mod kubernetes-agent/kas/go.sum ./kubernetes-agent/kas/
COPY kubernetes-agent/kas/cmd ./kubernetes-agent/kas/cmd
COPY kubernetes-agent/kas/pkg ./kubernetes-agent/kas/pkg

# Copy local dependency required by kas/go.mod replace directive
COPY polly ./polly
COPY client ./client

# Create a minimal Go workspace so module sums resolve from go.work.sum.
WORKDIR /workspace
RUN go work init ./kubernetes-agent/api ./kubernetes-agent/kas ./polly ./client

# Set build time if not provided
RUN if [ -z "$BUILD_TIME" ]; then BUILD_TIME="$(date -u +%Y%m%d.%H%M%S)"; fi

# Build API binary
WORKDIR /workspace/kubernetes-agent/api
RUN go mod download
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build \
    -trimpath \
    -ldflags="-s -w -X github.com/pluralsh/console/go/kubernetes-agent/api/pkg/environment.Version=${VERSION}" \
    -o /binaries/api .

# Build KAS and AGENTK binaries
WORKDIR /workspace/kubernetes-agent/kas
RUN go mod download

# Build kas binary
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build \
    -trimpath \
    -ldflags="-s -w \
        -X 'github.com/pluralsh/console/go/kubernetes-agent/cmd.Version=${VERSION}' \
        -X 'github.com/pluralsh/console/go/kubernetes-agent/cmd.Commit=${GIT_COMMIT}' \
        -X 'github.com/pluralsh/console/go/kubernetes-agent/cmd.BuildTime=${BUILD_TIME}'" \
    -o /binaries/kas ./cmd/kas

# Build agentk binary
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build \
    -trimpath \
    -ldflags="-s -w \
        -X 'github.com/pluralsh/console/go/kubernetes-agent/cmd.Version=${VERSION}' \
        -X 'github.com/pluralsh/console/go/kubernetes-agent/cmd.Commit=${GIT_COMMIT}' \
        -X 'github.com/pluralsh/console/go/kubernetes-agent/cmd.BuildTime=${BUILD_TIME}'" \
    -o /binaries/agentk ./cmd/agentk

# Final stage - minimal image with all three binaries
FROM debian:12-slim@sha256:7ff6ba31527b9e336162fa061746c366c4b2032f4d2cff2078bea43f78efe3f8 AS final

ARG BUILD_TIME=1970-01-01T00:00:00Z
ARG GIT_COMMIT=unknown
ARG VERSION=dev

# Pin the supported Debian security package that supplies current zoneinfo data.
RUN apt-get update && \
    apt-get install -y --no-install-recommends tzdata=2026c-0+deb12u1 && \
    rm -rf /var/lib/apt/lists/*

LABEL source="https://github.com/pluralsh/console/go/kubernetes-agent" \
      name="Kubernetes Agent Multi-Binary" \
      maintainer="Plural::sre" \
      vendor="Plural" \
      summary="Kubernetes Agent Multi-Binary Image" \
      description="Unified image containing api, kas, and agentk binaries for Plural CD" \
      org.opencontainers.image.created="${BUILD_TIME}" \
      org.opencontainers.image.authors="Plural Labs, Inc." \
      org.opencontainers.image.url="https://www.plural.sh" \
      org.opencontainers.image.documentation="https://github.com/pluralsh/console/tree/master/go/kubernetes-agent" \
      org.opencontainers.image.source="https://github.com/pluralsh/console/tree/master/go/kubernetes-agent" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.ref.name="${VERSION}" \
      org.opencontainers.image.revision="${GIT_COMMIT}" \
      org.opencontainers.image.vendor="Plural" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.title="KAS Server" \
      org.opencontainers.image.description="KAS server image for Plural CD" \
      org.opencontainers.image.base.name="debian:12-slim@sha256:7ff6ba31527b9e336162fa061746c366c4b2032f4d2cff2078bea43f78efe3f8" \
      org.opencontainers.image.rebuild-trigger="2026-10-23-kas"

# Copy all binaries from builder
COPY --from=builder /binaries/api /api
COPY --from=builder /binaries/kas /kas
COPY --from=builder /binaries/agentk /agentk

# Users can override the default entrypoint with /api or /agentk.

# Default to kas for backward compatibility
ENTRYPOINT ["/kas"]

# Expose common ports
# API
# 8000 - HTTP
# 8001 - HTTPS
# KAS
# 8150 - Agentk Listener
# 8151 - Observability
# 8153 - API Listener
# 8154 - Kubernetes API
# 8155 - Internal API
EXPOSE 8000 8001 8150 8151 8153 8154 8155
USER 65532:65532
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD ["/kas", "--help"]
