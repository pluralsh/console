FROM golang:1.26.2-alpine3.22 AS builder

ARG HELM_VERSION=v3.20.2
ARG TARGETARCH

# Install curl
RUN apk add --no-cache curl

WORKDIR /workspace
# Copy the Go Modules manifests
COPY go.mod go.mod
COPY go.sum go.sum
# cache deps before building and copying source so that we don't need to re-download as much
# and so that source changes don't invalidate our downloaded layer
RUN go mod download

# Copy the go source
COPY /cmd/agent cmd/agent
COPY /pkg pkg/
COPY /api api/
COPY /internal internal/

# Build
RUN CGO_ENABLED=0 GOOS=linux GOARCH=${TARGETARCH} GO111MODULE=on GOEXPERIMENT=greenteagc go build -a -o deployment-agent cmd/agent/*.go

# Get helm binary for kustomize helm inflate to work
RUN curl -L https://get.helm.sh/helm-${HELM_VERSION}-linux-${TARGETARCH}.tar.gz | tar xz && \
    mv linux-${TARGETARCH}/helm /usr/local/bin/helm && \
    chmod +x /usr/local/bin/helm

FROM alpine:3.22
WORKDIR /workspace

# Upgrade all packages to get the latest security fixes
# This addresses CVE for OpenSSL PKCS#12 type confusion vulnerability (libssl3 >= 3.3.6-r0)
RUN apk upgrade --no-cache && \
    mkdir /.kube && \
    chown 65532:65532 /.kube && \
    chmod 700 /.kube

COPY --from=builder /workspace/deployment-agent .
# Copy Helm binary from builder
COPY --from=builder /usr/local/bin/helm /usr/local/bin/helm

USER 65532:65532


ENTRYPOINT ["/workspace/deployment-agent"]
