ARG GO_FIPS_IMAGE_TAG=1.24.2
ARG GO_FIPS_IMAGE_REPO=ghcr.io/pluralsh/go-fips
ARG GO_FIPS_BASE_IMAGE=$GO_FIPS_IMAGE_REPO:$GO_FIPS_IMAGE_TAG

FROM $GO_FIPS_BASE_IMAGE AS builder

# Set environment variables for FIPS compliance
ENV OPENSSL_FIPS=1
ENV FIPS_MODE=true
# Set up Go environment
ENV CGO_ENABLED=1
ENV CC=gcc

ARG TARGETARCH
ARG TARGETOS
ARG VERSION



WORKDIR /workspace

# Retrieve application dependencies.
# This allows the container build to reuse cached dependencies.
# Expecting to copy go.mod and if present go.sum.
COPY go.mod go.mod
COPY go.sum go.sum
RUN go mod download

COPY cmd/harness ./cmd/harness
COPY pkg ./pkg
COPY internal ./internal
COPY api ./api


RUN GOOS=linux GOARCH=${TARGETARCH} GO111MODULE=on go build -a \
    -ldflags="-s -w -X github.com/pluralsh/deployment-operator/pkg/harness/environment.Version=${VERSION}" \
    -o harness \
    cmd/harness/*.go

FROM registry.access.redhat.com/ubi8/ubi-minimal:latest AS final

RUN microdnf install -y git openssl && \
    microdnf clean all

# Switch to the nonroot user
USER 65532:65532

# Set up the environment
# - copy the harness binary
# - copy the trivy binary
COPY --from=builder /workspace/harness /harness
COPY --from=aquasec/trivy:0.69.3 /usr/local/bin/trivy /usr/local/bin/trivy

WORKDIR /plural

ENTRYPOINT ["/harness", "--working-dir=/plural"]
