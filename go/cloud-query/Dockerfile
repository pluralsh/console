FROM golang:1.24.2 AS builder

WORKDIR /workspace

# Install protocol buffers compiler
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        protobuf-compiler

# Install required protoc Go plugins
RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@latest && \
    go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

# Add the Go binary directory to the PATH
RUN export PATH="$PATH:$(go env GOPATH)/bin"

# pre-copy/cache dependencies
COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Build the cloud-query binary
RUN make build

FROM debian:12-slim AS libraries

# Set TERM environment variable for terminal compatibility
# with the steampipe SQLite installer script
ENV TERM=xterm-256color

# Configure versions for Steampipe SQLite extensions
# Do not use latest versions here, as they may not be compatible
ARG AWS_VERSION=v1.14.1
ARG AZURE_VERSION=v1.4.0
ARG GCP_VERSION=v1.8.0

WORKDIR /workspace

# Download Steampipe SQLite extension installer script
ADD "https://steampipe.io/install/sqlite.sh" /workspace/sqlite.sh

# Install dependencies required by the installer script
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        bash \
        curl \
        ca-certificates

# Run SQLite installer script and install
# provider extensions for AWS, Azure, and GCP
RUN chmod +x /workspace/sqlite.sh && \
    mkdir -p /workspace/lib && \
    /workspace/sqlite.sh aws ${AWS_VERSION} /workspace/lib/ && \
    /workspace/sqlite.sh azure ${AZURE_VERSION} /workspace/lib/ && \
    /workspace/sqlite.sh gcp ${GCP_VERSION} /workspace/lib/

FROM gcr.io/distroless/cc-debian12:nonroot AS final

# Copy cloud-query and steampipe extensions
COPY --from=builder /workspace/bin/cloud-query /usr/local/bin/cloud-query
COPY --from=libraries /workspace/lib/ /steampipe/lib/

# Use nonroot user
USER 65532:65532

ENTRYPOINT ["/usr/local/bin/cloud-query", "--extensions-dir", "/steampipe/lib"]