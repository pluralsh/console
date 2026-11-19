# Build stage
FROM golang:1.27.4-alpine AS builder

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

# Download and unpack the Debian security packages from immutable package paths.
# Both packages are Architecture: all, so this stage works for the amd64 and
# arm64 images published by the Nexus workflows.
FROM debian:12.12-slim@sha256:d5d3f9c23164ea16f31852f95bd5959aad1c5e854332fe00f7b3a20fcc9f635c AS security-packages

ADD --checksum=sha256:3254eb870c8a949518214805aee5e4276af7699988ea8b9a3a583cd0f1eab31c \
    https://security.debian.org/debian-security/pool/updates/main/t/tzdata/tzdata_2026f-0+deb12u1_all.deb \
    /tmp/tzdata.deb
ADD --checksum=sha256:b9f76b5271a7ac373fd5e7e1b5b826a71ddd702b42a0d104955ecb1acfffc94b \
    https://security.debian.org/debian-security/pool/updates/main/c/ca-certificates/ca-certificates_20250419~deb12u2_all.deb \
    /tmp/ca-certificates.deb

RUN mkdir -p /packages/tzdata /packages/ca-certificates /packages/status/tzdata /packages/status/ca-certificates \
 && dpkg-deb --extract /tmp/tzdata.deb /packages/tzdata \
 && dpkg-deb --control /tmp/tzdata.deb /packages/status/tzdata \
 && dpkg-deb --extract /tmp/ca-certificates.deb /packages/ca-certificates \
 && dpkg-deb --control /tmp/ca-certificates.deb /packages/status/ca-certificates \
 && mkdir -p /packages/ca-certificates/etc/ssl/certs \
 && find /packages/ca-certificates/usr/share/ca-certificates -type f -name '*.crt' -print \
    | sort \
    | xargs cat > /packages/ca-certificates/etc/ssl/certs/ca-certificates.crt

# Runtime stage
FROM gcr.io/distroless/static-debian12@sha256:afa5c872c891853ca7fcf1f12c3edb23f7eeef36189728842dd51042ff57f7ab

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
      org.opencontainers.image.base.name="gcr.io/distroless/static-debian12@sha256:afa5c872c891853ca7fcf1f12c3edb23f7eeef36189728842dd51042ff57f7ab" \
      org.opencontainers.image.rebuild-trigger="2026-06-26-nexus"

WORKDIR /app

# Overlay the verified security packages and update distroless' package
# metadata so vulnerability scanners observe the installed package versions.
COPY --from=security-packages /packages/tzdata/ /
COPY --from=security-packages /packages/ca-certificates/ /
COPY --from=security-packages /packages/status/tzdata/control /var/lib/dpkg/status.d/tzdata
COPY --from=security-packages /packages/status/ca-certificates/control /var/lib/dpkg/status.d/ca-certificates

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

HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD ["/app/nexus", "--help"]
