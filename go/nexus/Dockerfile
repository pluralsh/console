# Build stage
FROM golang:1.25-alpine AS builder

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

