# Install the fixed Debian tzdata release independently of the distroless base image.
FROM debian:bookworm-slim AS tzdata

ARG TZDATA_VERSION=2026c-0+deb12u1

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install --no-install-recommends --yes "tzdata=${TZDATA_VERSION}" \
    && awk 'BEGIN { RS = "" } /^Package: tzdata/ { print }' /var/lib/dpkg/status > /tmp/tzdata-status \
    && rm -rf /var/lib/apt/lists/*

# Build stage
FROM golang:1.27.1-alpine AS builder

WORKDIR /build

# Install build dependencies
RUN apk add --no-cache git make

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build binary with version info
ARG VERSION=dev
ARG GIT_COMMIT=unknown
ARG BUILD_TIME

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s \
      -X github.com/pluralsh/console/go/nexus/internal/version.Version=${VERSION} \
      -X github.com/pluralsh/console/go/nexus/internal/version.GitCommit=${GIT_COMMIT} \
      -X github.com/pluralsh/console/go/nexus/internal/version.BuildTime=${BUILD_TIME}" \
    -o nexus \
    ./cmd/main.go

# Runtime stage
FROM gcr.io/distroless/static-debian12:nonroot
# Replace the base image tzdata payload and package metadata with the pinned release.
COPY --from=tzdata /usr/share/doc/tzdata /usr/share/doc/tzdata
COPY --from=tzdata /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=tzdata /tmp/tzdata-status /var/lib/dpkg/status.d/tzdata
COPY --from=tzdata /var/lib/dpkg/info/tzdata.md5sums /var/lib/dpkg/status.d/tzdata.md5sums

ARG BUILD_TIME=1970-01-01T00:00:00Z
ARG GIT_COMMIT=unknown
ARG VERSION=dev

LABEL org.opencontainers.image.created="${BUILD_TIME}" \
      org.opencontainers.image.authors="Plural Labs, Inc." \
      org.opencontainers.image.url="https://www.plural.sh" \
      org.opencontainers.image.documentation="https://github.com/pluralsh/console/tree/master/go/nexus" \
      org.opencontainers.image.source="https://github.com/pluralsh/console/tree/master/go/nexus" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.ref.name="${VERSION}" \
      org.opencontainers.image.revision="${GIT_COMMIT}" \
      org.opencontainers.image.vendor="Plural" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.title="Nexus" \
      org.opencontainers.image.description="AI proxy service for Plural Console" \
      org.opencontainers.image.base.name="gcr.io/distroless/static-debian12:nonroot" \
      org.opencontainers.image.rebuild-trigger="2026-06-26-nexus"

WORKDIR /app

# Copy binary from builder
COPY --from=builder /build/nexus /app/nexus

# Copy default config (optional)
COPY --from=builder /build/config/config.yaml /app/config/config.yaml

# Expose HTTP port
EXPOSE 8080

# Run as non-root user
USER nonroot:nonroot

ENTRYPOINT ["/app/nexus"]
CMD ["--config", "/app/config/config.yaml"]

