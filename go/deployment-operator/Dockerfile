FROM golang:1.27.3-alpine3.23 AS builder

ARG HELM_VERSION=v3.21.2
ARG TARGETARCH

# Install curl
RUN apk add --no-cache curl

WORKDIR /workspace

# Copy required local modules referenced by go.mod replace directives
COPY /client /workspace/client
COPY /polly /workspace/polly

WORKDIR /workspace/deployment-operator

# Copy the Go Modules manifests
# Cache deps before building and copying source so that we don't need to re-download as much
# and so that source changes don't invalidate our downloaded layer.
COPY deployment-operator/go.* ./
RUN go mod download

# Copy the go source
COPY deployment-operator/cmd/agent cmd/agent
COPY deployment-operator/pkg pkg/
COPY deployment-operator/api api/
COPY deployment-operator/internal internal/

# Build
RUN CGO_ENABLED=0 GOOS=linux GOARCH=${TARGETARCH} GO111MODULE=on GOEXPERIMENT=greenteagc go build -tags musl -a -o deployment-agent cmd/agent/*.go

# Get helm binary for kustomize helm inflate to work
RUN curl -L https://get.helm.sh/helm-${HELM_VERSION}-linux-${TARGETARCH}.tar.gz | tar xz && \
    mv linux-${TARGETARCH}/helm /usr/local/bin/helm && \
    chmod +x /usr/local/bin/helm

FROM debian:13-slim@sha256:4876fdea29cac1a33a3195f1eb1952feb1fca7dd6dd00be3e2f1879cf20d34d2
WORKDIR /workspace

# Pin the supported Debian security package used by the runtime trust store.
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates=20250419+deb13u1 && \
    rm -rf /var/lib/apt/lists/* && \
    mkdir /.kube && \
    chown 65532:65532 /.kube && \
    chmod 700 /.kube && \
    mkdir -p /tmp/gomonty && \
    chown 65532:65532 /tmp/gomonty

COPY --from=builder /workspace/deployment-operator/deployment-agent .
# Copy Helm binary from builder
COPY --from=builder /usr/local/bin/helm /usr/local/bin/helm

USER 65532:65532

ENV GOMONTY_FFI_CACHE_DIR=/tmp/gomonty

ENTRYPOINT ["/workspace/deployment-agent"]
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD ["/workspace/deployment-agent", "--help"]
