# Build the manager binary
FROM golang:1.26.4 AS builder
ARG TARGETOS
ARG TARGETARCH
ARG GIT_COMMIT=unknown
ARG VERSION=dev

WORKDIR /workspace

# Copy required local modules
COPY /client /workspace/client
COPY /polly /workspace/polly

WORKDIR /workspace/controller

# Retrieve application dependencies.
# This allows the container build to reuse cached dependencies.
# Expecting to copy go.mod and if present go.sum.
COPY controller/go.* ./
RUN go mod download

COPY controller/api ./api
COPY controller/cmd ./cmd
COPY controller/internal ./internal

# Build
# the GOARCH has not a default value to allow the binary be built according to the host where the command
# was called. For example, if we call make docker-build in a local env which has the Apple Silicon M1 SO
# the docker BUILDPLATFORM arg will be linux/arm64 when for Apple x86 it will be linux/amd64. Therefore,
# by leaving it empty we can ensure that the container and binary shipped on it will have the same platform.
RUN CGO_ENABLED=0 GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH} go build -ldflags '-s -w -X main.version=${VERSION} -X main.commit=${GIT_COMMIT}' -a -o manager cmd/*.go

# Use distroless as minimal base image to package the manager binary
# Refer to https://github.com/GoogleContainerTools/distroless for more details
FROM gcr.io/distroless/static:nonroot

ARG BUILD_TIME=1970-01-01T00:00:00Z
ARG GIT_COMMIT=unknown
ARG VERSION=dev

LABEL org.opencontainers.image.created="${BUILD_TIME}" \
      org.opencontainers.image.authors="Plural Labs, Inc." \
      org.opencontainers.image.url="https://www.plural.sh" \
      org.opencontainers.image.documentation="https://github.com/pluralsh/console/tree/master/go/controller" \
      org.opencontainers.image.source="https://github.com/pluralsh/console/tree/master/go/controller" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.ref.name="${VERSION}" \
      org.opencontainers.image.revision="${GIT_COMMIT}" \
      org.opencontainers.image.vendor="Plural" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.title="Deployment Controller" \
      org.opencontainers.image.description="Deployment controller for Plural Console" \
      org.opencontainers.image.base.name="gcr.io/distroless/static:nonroot" \
      org.opencontainers.image.rebuild-trigger="2026-06-26-deployment-controller"

WORKDIR /
COPY --from=builder /workspace/controller/manager .
USER 65532:65532

ENTRYPOINT ["/manager"]
