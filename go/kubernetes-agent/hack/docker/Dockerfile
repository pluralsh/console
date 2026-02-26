# Multi-binary Dockerfile for kubernetes-agent
# Builds: api, kas, and agentk binaries in a single image
# Usage: docker run <image> [api|kas|agentk] [args...]

# Builder stage for all binaries
FROM golang:1.25.7-alpine3.22 AS builder

ARG TARGETARCH
ARG TARGETOS
ARG VERSION=dev
ARG GIT_COMMIT=unknown
ARG BUILD_TIME

WORKDIR /workspace

# Copy API module
COPY api/go.mod api/go.sum ./api/
COPY api/main.go ./api/
COPY api/pkg ./api/pkg

# Copy KAS module (includes both kas and agentk)
COPY kas/go.mod kas/go.sum ./kas/
COPY kas/cmd ./kas/cmd
COPY kas/pkg ./kas/pkg

# Set build time if not provided
RUN if [ -z "$BUILD_TIME" ]; then BUILD_TIME="$(date -u +%Y%m%d.%H%M%S)"; fi

# Build API binary
WORKDIR /workspace/api
RUN go mod download
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build \
    -trimpath \
    -ldflags="-s -w -X github.com/pluralsh/console/go/kubernetes-agent/api/pkg/environment.Version=${VERSION}" \
    -o /binaries/api .

# Build KAS and AGENTK binaries
WORKDIR /workspace/kas
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
FROM gcr.io/distroless/static-debian12:nonroot AS final

LABEL source="https://github.com/pluralsh/console/go/kubernetes-agent" \
      name="Kubernetes Agent Multi-Binary" \
      maintainer="Plural::sre" \
      vendor="Plural" \
      summary="Kubernetes Agent Multi-Binary Image" \
      description="Unified image containing api, kas, and agentk binaries for Plural CD"

# Copy all binaries from builder
COPY --from=builder /binaries/api /api
COPY --from=builder /binaries/kas /kas
COPY --from=builder /binaries/agentk /agentk

# Create a simple entrypoint script (shell script won't work in distroless)
# Instead, we'll use kas as the default entrypoint
# Users can override with: docker run image /api or /agentk

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

