ARG UBI_MINIMAL_VERSION="latest"
ARG GO_FIPS_IMAGE_TAG=1.24.2
ARG GO_FIPS_IMAGE_REPO=ghcr.io/pluralsh/go-fips
ARG GO_FIPS_BASE_IMAGE=$GO_FIPS_IMAGE_REPO:$GO_FIPS_IMAGE_TAG

FROM ${GO_FIPS_BASE_IMAGE} AS builder

# Set environment variables for FIPS compliance
ENV OPENSSL_FIPS=1
ENV FIPS_MODE=true
# Set up Go environment
ENV CGO_ENABLED=1
ENV CC=gcc

ARG HELM_VERSION=v3.17.3
ARG TARGETARCH

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
RUN GOOS=linux GOARCH=${TARGETARCH} GO111MODULE=on go build -a -o deployment-agent cmd/agent/*.go

# Get helm binary for kustomize helm inflate to work
RUN curl -L https://get.helm.sh/helm-${HELM_VERSION}-linux-${TARGETARCH}.tar.gz | tar xz && \
    mv linux-${TARGETARCH}/helm /usr/local/bin/helm && \
    chmod +x /usr/local/bin/helm

# This the minimal UBI FIPS compliance image
FROM registry.access.redhat.com/ubi8/ubi-minimal:$UBI_MINIMAL_VERSION
WORKDIR /workspace

RUN microdnf install -y openssl && \
    microdnf clean all

RUN mkdir /.kube && chown 65532:65532 /.kube

COPY --from=builder /workspace/deployment-agent .
# Copy Helm binary from builder
COPY --from=builder /usr/local/bin/helm /usr/local/bin/helm

USER 65532:65532

ENTRYPOINT ["/workspace/deployment-agent"]