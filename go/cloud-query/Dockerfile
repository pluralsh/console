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
RUN CGO_ENABLED=0 go build -o bin/cloud-query cmd/*.go

FROM golang:1.24.2 AS libraries

# Configure versions for Steampipe extensions
# Do not use latest versions here, as they may not be compatible
ARG AWS_VERSION=1.14.1
ARG AZURE_VERSION=1.4.0
ARG GCP_VERSION=1.8.0

WORKDIR /workspace

COPY . .

# Install dependencies required by the installer script
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        bash \
        curl \
        ca-certificates

# Run installer script and install
# provider extensions for AWS, Azure, and GCP
RUN mkdir -p /workspace/lib && \
    /workspace/hack/postgres.sh -p aws -v ${AWS_VERSION} -d /workspace/lib/ && \
    /workspace/hack/postgres.sh -p azure -v ${AZURE_VERSION} -d /workspace/lib/ && \
    /workspace/hack/postgres.sh -p gcp -v ${GCP_VERSION} -d /workspace/lib/

FROM cgr.dev/chainguard/wolfi-base AS final

RUN apk add libstdc++

# Copy cloud-query and steampipe extensions
COPY --from=builder /workspace/bin/cloud-query /usr/local/bin/cloud-query
COPY --chown=nonroot --from=libraries /workspace/lib/ /steampipe/lib/

USER nonroot

WORKDIR /steampipe/runtime/data

CMD ["/usr/local/bin/cloud-query", "--extensions-dir", "/steampipe/lib", "--database-runtime-dir", "/steampipe/runtime", "--database-cache-dir", "/steampipe/cache", "--database-data-dir", "/steampipe/runtime/data/cache"]